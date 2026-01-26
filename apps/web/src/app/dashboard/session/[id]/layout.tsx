"use client";

import { use } from "react";
import { Sidebar } from "@/components/dashboard";

interface SessionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function SessionLayout({
  children,
  params,
}: SessionLayoutProps) {
  const resolvedParams = use(params);

  return (
    <>
      {/* Override the parent Sidebar with session-aware version */}
      <div className="fixed left-0 top-0 z-50 h-screen w-64">
        <Sidebar sessionId={resolvedParams.id} />
      </div>
      {children}
    </>
  );
}
