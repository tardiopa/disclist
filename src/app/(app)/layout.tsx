"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth";
import { LibraryProvider } from "@/components/library";
import { Shell } from "@/components/shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  if (!user) return null;
  return (
    <LibraryProvider>
      <Shell>{children}</Shell>
    </LibraryProvider>
  );
}
