import { z } from "zod";
import { apiClient, type RequestOptions } from "./client";
import { apiResponseSchema } from "./schemas";

export type SocialUiPlatform =
  | "x"
  | "linkedin"
  | "instagram"
  | "youtube"
  | "general";

const socialConnectionSchema = z.object({
  id: z.string().min(1),
  platform: z.string().min(1),
  platformUserId: z.string().min(1),
  platformUsername: z.string().nullable().optional(),
  accountName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  isActive: z.boolean(),
  scopes: z.array(z.string()).optional(),
  lastUsedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

const socialConnectionsResponseSchema = apiResponseSchema(
  z.object({
    connections: z.array(socialConnectionSchema),
  })
);

export interface SocialConnectionInfo {
  id: string;
  platform: SocialUiPlatform;
  platformLabel: string;
  rawPlatform: string;
  displayName: string;
  accountName?: string;
  platformUsername?: string;
  avatarUrl?: string;
  isActive: boolean;
  scopes: string[];
  lastUsedAt?: string | null;
  createdAt: string;
}

function withAuth(accessToken?: string, options: RequestOptions = {}): RequestOptions {
  if (!accessToken) return options;

  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

function normalizeUiPlatform(rawPlatform: string): SocialUiPlatform {
  switch (rawPlatform.trim().toUpperCase()) {
    case "TWITTER":
      return "x";
    case "LINKEDIN":
      return "linkedin";
    case "INSTAGRAM":
      return "instagram";
    case "YOUTUBE":
      return "youtube";
    default:
      return "general";
  }
}

function getPlatformLabel(platform: string): string {
  switch (platform.trim().toUpperCase()) {
    case "TWITTER":
      return "X";
    case "LINKEDIN":
      return "LinkedIn";
    case "INSTAGRAM":
      return "Instagram";
    case "YOUTUBE":
      return "YouTube";
    case "TIKTOK":
      return "TikTok";
    case "FACEBOOK":
      return "Facebook";
    case "THREADS":
      return "Threads";
    case "BLUESKY":
      return "Bluesky";
    default:
      return platform;
  }
}

export async function getSocialConnections(
  accessToken: string
): Promise<SocialConnectionInfo[]> {
  const response = await apiClient.get(
    "/api/v1/social/connections",
    socialConnectionsResponseSchema,
    withAuth(accessToken)
  );

  return response.data.connections.map((connection) => {
    const platformLabel = getPlatformLabel(connection.platform);
    const displayName =
      connection.accountName ||
      connection.platformUsername ||
      `${platformLabel} account`;

    return {
      id: connection.id,
      platform: normalizeUiPlatform(connection.platform),
      platformLabel,
      rawPlatform: connection.platform,
      displayName,
      accountName: connection.accountName ?? undefined,
      platformUsername: connection.platformUsername ?? undefined,
      avatarUrl: connection.avatarUrl ?? undefined,
      isActive: connection.isActive,
      scopes: connection.scopes ?? [],
      lastUsedAt: connection.lastUsedAt ?? null,
      createdAt: connection.createdAt,
    };
  });
}
