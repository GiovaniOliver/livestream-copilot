"use client";

import { Sidebar } from "@/components/dashboard";

interface AgentObservabilityLayoutProps {
  children: React.ReactNode;
}

export default function AgentObservabilityLayout({
  children,
}: AgentObservabilityLayoutProps) {
  return (
    <>
      {/* Sidebar without sessionId since this isn't a session page */}
      <div className="fixed left-0 top-0 z-50 h-screen w-64">
        <Sidebar />
      </div>
      {children}
    </>
  );
}
