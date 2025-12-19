import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { checkRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { auditLogin } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  // No adapter - we handle user creation manually in signIn callback
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Check rate limiting
        const rateLimit = await checkRateLimit(credentials.email);
        if (!rateLimit.allowed) {
          throw new Error(rateLimit.reason || "Too many login attempts");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        });

        if (!user || !user.passwordHash) {
          await recordLoginAttempt(credentials.email, false);
          await auditLogin("", credentials.email, false);
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          await recordLoginAttempt(credentials.email, false);
          await auditLogin(user.id, credentials.email, false);
          throw new Error("Invalid email or password");
        }

        // Record successful login
        await recordLoginAttempt(credentials.email, true);
        await auditLogin(user.id, user.email, true);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          organizationId: user.organizationId || undefined,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth - create or link user
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true },
          });
          
          if (existingUser) {
            const dbUser = existingUser;
            // User exists - check if Google account is linked
            const googleAccountLinked = dbUser.accounts.some(
              (acc) => acc.provider === "google" && acc.providerAccountId === account.providerAccountId
            );
            
            if (!googleAccountLinked) {
              // Link Google account to existing user
              await prisma.account.upsert({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                  },
                },
                create: {
                  userId: dbUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
                update: {
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                },
              });
            }
            
            // Update user's name/image if not set
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                name: dbUser.name || user.name,
                image: dbUser.image || user.image,
                emailVerified: dbUser.emailVerified || new Date(),
              },
            });
            
            // Use existing user's ID for the session
            user.id = dbUser.id;
          } else {
            // Create new user
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
              },
            });
            
            // Create account link
            await prisma.account.create({
              data: {
                userId: newUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
            
            user.id = newUser.id;
          }
        } catch (error) {
          console.error("Error in Google signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // Fetch fresh organizationId from DB in case it was set during invite
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { organizationId: true },
        });
        token.organizationId = dbUser?.organizationId || (user as { organizationId?: string }).organizationId;
      }
      
      if (trigger === "update" && session?.organizationId) {
        token.organizationId = session.organizationId;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string | undefined;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Handle absolute URLs on the same origin
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to dashboard for authenticated users
      return `${baseUrl}/dashboard`;
    },
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }
  
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireOrganization() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (!user.organizationId) {
    throw new Error("No organization");
  }
  return { user, organizationId: user.organizationId };
}
