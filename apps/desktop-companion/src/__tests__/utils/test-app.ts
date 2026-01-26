/**
 * Test Application Factory
 *
 * Creates an Express application configured for integration testing.
 * Mocks authentication and database as needed.
 */

import express, { type Application, type Request, type Response, type NextFunction } from "express";
import { vi } from "vitest";
import type { AuthenticatedUser, AuthenticatedRequest } from "../../auth/middleware.js";

/**
 * Mock user for authenticated requests.
 */
export const mockUser: AuthenticatedUser = {
  id: "test-user-id",
  email: "test@example.com",
  platformRole: "USER",
  organizations: [{ id: "org-1", role: "MEMBER" }],
  authMethod: "jwt",
};

/**
 * Mock admin user for admin-only routes.
 */
export const mockAdminUser: AuthenticatedUser = {
  id: "admin-user-id",
  email: "admin@example.com",
  platformRole: "ADMIN",
  organizations: [{ id: "org-1", role: "OWNER" }],
  authMethod: "jwt",
};

/**
 * Creates a mock authentication middleware that always authenticates.
 */
export function createMockAuthMiddleware(user: AuthenticatedUser = mockUser) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as AuthenticatedRequest).user = user;
    next();
  };
}

/**
 * Creates test Express application with sessions routes.
 */
export async function createTestApp(): Promise<Application> {
  const app = express();

  app.use(express.json());

  // Import the router dynamically to avoid mock issues
  const { createSessionsRouter } = await import("../../api/sessions.js");

  // Create router and mount it
  const sessionsRouter = createSessionsRouter();
  app.use("/api/sessions", sessionsRouter);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Test app error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: err.message } });
  });

  return app;
}

/**
 * Creates test Express application with auth routes.
 */
export async function createTestAuthApp(): Promise<Application> {
  const app = express();

  app.use(express.json());

  // Import the router dynamically
  const { createAuthRouter } = await import("../../auth/routes.js");

  const authRouter = createAuthRouter();
  app.use("/api/v1/auth", authRouter);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Test app error:", err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: err.message } });
  });

  return app;
}

/**
 * Generates a valid test JWT token (mock).
 */
export function generateTestToken(user: AuthenticatedUser = mockUser): string {
  return `test-token-${user.id}`;
}
