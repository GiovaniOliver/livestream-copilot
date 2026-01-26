"use client";

import { Sidebar } from "@/components/dashboard";

interface AgentWorkflowsLayoutProps {
  children: React.ReactNode;
}

export default function AgentWorkflowsLayout({
  children,
}: AgentWorkflowsLayoutProps) {
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
