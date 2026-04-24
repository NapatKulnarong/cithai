import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { CithaiProvider } from "@/components/cithai-context";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/login");
  }

  const account = {
    name: session.user?.name?.trim() || email,
    email,
    image: session.user?.image ?? null,
  };

  return (
    <CithaiProvider>
      <AppShell account={account}>{children}</AppShell>
    </CithaiProvider>
  );
}
