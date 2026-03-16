import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";

const authSecret = process.env.AUTH_SECRET;
const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !authSecret) {
  throw new Error("Missing AUTH_SECRET environment variable");
}

if (isProduction && (!googleClientId || !googleClientSecret)) {
  throw new Error("Missing Google OAuth environment variables");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: authSecret ?? "dev-auth-secret",
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: googleClientId ?? "google-client-id-placeholder",
      clientSecret: googleClientSecret ?? "google-client-secret-placeholder",
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role ?? "USER";
      }

      if (!token.role) {
        token.role = "USER";
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? token.sub ?? "";
        session.user.role = token.role ?? "USER";
      }

      return session;
    },
  },
};
