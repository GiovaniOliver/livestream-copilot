import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: {
    default: "FluxBoard - Live Workflows for Streams, Podcasts & More",
    template: "%s | FluxBoard",
  },
  description:
    "FluxBoard is a workflow-first copilot for streamers, podcast teams, writers rooms, brainstorms, and debates. Pick a workflow, capture from OBS or mobile, and review agent outputs on dashboards that match the moment.",
  keywords: [
    "livestream",
    "streaming",
    "podcast",
    "content creation",
    "workflow",
    "OBS",
    "AI copilot",
    "real-time",
    "clips",
    "transcription",
  ],
  authors: [{ name: "FluxBoard Team" }],
  creator: "FluxBoard",
  publisher: "FluxBoard",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FluxBoard",
    title: "FluxBoard - Live Workflows for Streams, Podcasts & More",
    description:
      "Turn live sessions into publishable assets while they happen. Workflow-first copilot for streamers, podcasters, and creators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FluxBoard - Live Workflows for Streams, Podcasts & More",
    description:
      "Turn live sessions into publishable assets while they happen.",
  },
  icons: {
    icon: "/assets/favicon.png",
    apple: "/assets/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gradient-hero">
        <ErrorBoundary>
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
