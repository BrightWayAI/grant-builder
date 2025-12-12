import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    organizationId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    organizationId?: string;
  }
}
