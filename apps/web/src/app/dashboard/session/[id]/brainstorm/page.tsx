import type { Metadata } from "next";
import { BrainstormDashboardClient } from "./BrainstormDashboardClient";

export const metadata: Metadata = {
  title: "Mind Map Room",
  description: "Brainstorming tools with idea clustering and mind maps",
};

interface BrainstormPageProps {
  params: Promise<{ id: string }>;
}

export default async function BrainstormPage({ params }: BrainstormPageProps) {
  const { id } = await params;

  return <BrainstormDashboardClient sessionId={id} />;
}
