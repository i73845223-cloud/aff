import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AffiliateManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "AFFILIATE" && session.user.role !== "ADMIN")) {
    redirect("/");
  }
  return <>{children}</>;
}