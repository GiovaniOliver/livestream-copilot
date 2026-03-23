import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    upsert: vi.fn(),
  },
  organizationMember: {
    upsert: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
}));

const mockGenerateAccessToken = vi.hoisted(() =>
  vi.fn().mockReturnValue("access-token")
);
const mockGenerateRefreshToken = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    token: "refresh-token",
    jti: "refresh-jti",
  })
);
const mockVerifyRefreshToken = vi.hoisted(() =>
  vi.fn().mockReturnValue({ sub: "cuser00000000000000000001" })
);
const mockVerifyPassword = vi.hoisted(() =>
  vi.fn().mockResolvedValue(true)
);
const mockNeedsRehash = vi.hoisted(() =>
  vi.fn().mockReturnValue(false)
);
const mockHashToken = vi.hoisted(() =>
  vi.fn().mockImplementation((token: string) => `hash:${token}`)
);

const mockEmailService = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
  isConfigured: vi.fn().mockReturnValue(true),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn().mockReturnThis(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../services/email.js", () => ({
  emailService: mockEmailService,
}));

vi.mock("../../logger/index.js", () => ({
  logger: mockLogger,
  createLogger: vi.fn().mockReturnValue(mockLogger),
  apiLogger: mockLogger,
  obsLogger: mockLogger,
  sttLogger: mockLogger,
  ffmpegLogger: mockLogger,
}));

vi.mock("../../auth/utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../auth/utils.js")>();

  return {
    ...actual,
    validatePasswordStrength: vi.fn().mockResolvedValue({
      valid: true,
      errors: [],
    }),
    hashPassword: vi.fn().mockResolvedValue("$2b$12$mocked-hash-value"),
    verifyPassword: mockVerifyPassword,
    needsRehash: mockNeedsRehash,
    generateAccessToken: mockGenerateAccessToken,
    generateRefreshToken: mockGenerateRefreshToken,
    verifyRefreshToken: mockVerifyRefreshToken,
    hashToken: mockHashToken,
    getRefreshTokenExpiry: vi
      .fn()
      .mockReturnValue(new Date("2026-12-31T00:00:00.000Z")),
  };
});

vi.mock("../../config/env.js", () => ({
  validateEnv: vi.fn().mockReturnValue({
    NODE_ENV: "test",
    JWT_SECRET: crypto.randomBytes(32).toString("base64"),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString("base64"),
    JWT_ACCESS_EXPIRY: 900,
    JWT_REFRESH_EXPIRY: 604800,
    API_KEY_ENV: "test",
    APP_URL: "http://localhost:3000",
  }),
}));

import { authService } from "../../auth/service.js";
import {
  OrgRole,
  PlatformRole,
  UserStatus,
} from "../../generated/prisma/enums.js";

function createMockUser(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "cuser00000000000000000001",
    email: "creator@example.com",
    passwordHash: "$2b$12$existing-hash",
    emailVerified: true,
    name: "Creator",
    avatarUrl: null,
    platformRole: PlatformRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    memberships: [],
    ...overrides,
  };
}

function createMockOrganization(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "corg000000000000000000001",
    name: "Creator's Workspace",
    slug: "creator-workspace-00000001",
    description: null,
    avatarUrl: null,
    ownerId: "cuser00000000000000000001",
    settings: {},
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createMockMembership(
  organization: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "cmember000000000000000001",
    organizationId: organization.id,
    userId: "cuser00000000000000000001",
    role: OrgRole.OWNER,
    invitedBy: null,
    inviteEmail: null,
    inviteToken: null,
    inviteExpiresAt: null,
    joinedAt: new Date("2025-01-01T00:00:00.000Z"),
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    organization,
    ...overrides,
  };
}

describe("Auth Service Organization Bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mockPrisma.refreshToken.create.mockResolvedValue({ id: "refresh-1" });
    mockGenerateAccessToken.mockReturnValue("access-token");
    mockGenerateRefreshToken.mockReturnValue({
      token: "refresh-token",
      jti: "refresh-jti",
    });
    mockVerifyRefreshToken.mockReturnValue({
      sub: "cuser00000000000000000001",
    });
    mockVerifyPassword.mockResolvedValue(true);
    mockNeedsRehash.mockReturnValue(false);
  });

  it("bootstraps a personal organization during login when the user has none", async () => {
    const userWithoutOrg = createMockUser();
    const organization = createMockOrganization();
    const userWithOrg = createMockUser({
      memberships: [createMockMembership(organization)],
    });

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(userWithoutOrg)
      .mockResolvedValueOnce(userWithoutOrg)
      .mockResolvedValueOnce(userWithOrg);
    mockPrisma.organization.upsert.mockResolvedValue(organization);
    mockPrisma.organizationMember.upsert.mockResolvedValue(
      createMockMembership(organization)
    );

    const result = await authService.login(
      "creator@example.com",
      "SecurePass123!@"
    );

    expect(mockPrisma.organization.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          ownerId: userWithoutOrg.id,
          name: "Creator's Workspace",
        }),
      })
    );
    expect(mockPrisma.organizationMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          organizationId: organization.id,
          userId: userWithoutOrg.id,
          role: OrgRole.OWNER,
          joinedAt: expect.any(Date),
        }),
      })
    );
    expect(mockGenerateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        organizations: [{ id: organization.id, role: OrgRole.OWNER }],
      })
    );
    expect(result.user.memberships).toHaveLength(1);
    expect(result.user.memberships[0]?.organization.id).toBe(organization.id);
  });

  it("bootstraps a personal organization during refresh when the token owner has none", async () => {
    const userWithoutOrg = createMockUser();
    const organization = createMockOrganization();
    const userWithOrg = createMockUser({
      memberships: [createMockMembership(organization)],
    });

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: "refresh-1",
      userId: userWithoutOrg.id,
      tokenHash: "hash:refresh-token",
      revokedAt: null,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      user: userWithoutOrg,
    });
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(userWithoutOrg)
      .mockResolvedValueOnce(userWithOrg);
    mockPrisma.organization.upsert.mockResolvedValue(organization);
    mockPrisma.organizationMember.upsert.mockResolvedValue(
      createMockMembership(organization)
    );

    const result = await authService.refreshAccessToken("refresh-token");

    expect(result.accessToken).toBe("access-token");
    expect(mockGenerateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        organizations: [{ id: organization.id, role: OrgRole.OWNER }],
      })
    );
  });

  it("returns an existing organization membership without bootstrapping new org state", async () => {
    const organization = createMockOrganization();
    const userWithOrg = createMockUser({
      memberships: [createMockMembership(organization)],
    });

    mockPrisma.user.findUnique.mockResolvedValue(userWithOrg);

    const result = await authService.getUserWithOrgs(
      "cuser00000000000000000001"
    );

    expect(result?.memberships).toHaveLength(1);
    expect(mockPrisma.organization.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.organizationMember.upsert).not.toHaveBeenCalled();
  });
});
