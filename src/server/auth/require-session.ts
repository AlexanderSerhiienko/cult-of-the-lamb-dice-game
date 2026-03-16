import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    role: session.user.role ?? "USER",
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  };
}
