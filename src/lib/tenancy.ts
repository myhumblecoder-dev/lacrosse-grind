import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  redirect("/signin");
  // The redirect function throws, so this line is unreachable.
  throw new Error("Redirected");
}