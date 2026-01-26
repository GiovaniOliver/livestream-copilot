import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your FluxBoard settings and integrations",
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <>
      {/* Override the parent Sidebar without sessionId for settings */}
      <div className="fixed left-0 top-0 z-50 h-screen w-64">
        <Sidebar />
      </div>
      {children}
    </>
  );
}
