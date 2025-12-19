import { NextAuthOptions, getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { checkRateLimit, recordLoginAttempt } from "@/lib/rate-limit";
import { auditLogin } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // This allows linking OAuth to existing email accounts
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
      // PrismaAdapter + allowDangerousEmailAccountLinking handles account linking
      // Just log for debugging
      console.log("[AUTH] signIn", { provider: account?.provider, email: user.email, userId: user.id });
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // Fetch organizationId from DB
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { organizationId: true },
        });
        token.organizationId = dbUser?.organizationId || undefined;
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
      // Default to dashboard
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
