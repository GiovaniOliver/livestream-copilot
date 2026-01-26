"use client";

import { Sidebar } from "@/components/dashboard";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <WebSocketProvider>
        <div className="min-h-screen bg-bg-0">
          <Sidebar />
          <main className="ml-64 min-h-screen">{children}</main>
        </div>
      </WebSocketProvider>
    </ProtectedRoute>
  );
}
