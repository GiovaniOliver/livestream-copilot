/**
 * Billing Routes
 *
 * Express router providing billing endpoints:
 * - Create checkout session
 * - Customer portal access
 * - Subscription info
 * - Webhook handling
 *
 * @module billing/routes
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { billingService, PLANS } from "./service.js";
import { logger } from '../logger/index.js';
import {
  authenticateToken,
  requireOrgRole,
  type AuthenticatedRequest,
} from "../auth/middleware.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const checkoutSessionSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});

const portalSessionSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/v1/billing/plans
 * Get available subscription plans.
 */
async function getPlansHandler(req: Request, res: Response): Promise<void> {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    description: plan.description,
    features: plan.features,
    monthlyPriceId: plan.monthlyPriceId,
    yearlyPriceId: plan.yearlyPriceId,
  }));

  sendSuccess(res, { plans });
}

/**
 * POST /api/v1/billing/checkout-session
 * Create a Stripe checkout session.
 */
async function createCheckoutSessionHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult = checkoutSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        validationResult.error.errors.map((e) => e.message).join("; ")
      );
      return;
    }

    const { priceId, organizationId } = validationResult.data;

    // Get base URL from request
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const result = await billingService.createCheckoutSession(
      organizationId,
      priceId,
      `${baseUrl}/billing/success`,
      `${baseUrl}/billing/cancel`
    );

    sendSuccess(res, result);
  } catch (error) {
    logger.error({ err: error }, "[billing/routes] Checkout session error");
    sendError(
      res,
      500,
      "CHECKOUT_ERROR",
      error instanceof Error ? error.message : "Failed to create checkout session"
    );
  }
}

/**
 * POST /api/v1/billing/portal
 * Create a Stripe customer portal session.
 */
async function createPortalSessionHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult = portalSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        validationResult.error.errors.map((e) => e.message).join("; ")
      );
      return;
    }

    const { organizationId } = validationResult.data;

    // Get base URL from request
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    const returnUrl = `${protocol}://${host}/settings/billing`;

    const result = await billingService.createPortalSession(
      organizationId,
      returnUrl
    );

    sendSuccess(res, result);
  } catch (error) {
    logger.error({ err: error }, "[billing/routes] Portal session error");
    sendError(
      res,
      500,
      "PORTAL_ERROR",
      error instanceof Error ? error.message : "Failed to create portal session"
    );
  }
}

/**
 * GET /api/v1/billing/subscription/:organizationId
 * Get subscription info for an organization.
 */
async function getSubscriptionHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      sendError(res, 400, "VALIDATION_ERROR", "Organization ID is required");
      return;
    }

    const subscription = await billingService.getSubscriptionInfo(organizationId);

    sendSuccess(res, { subscription });
  } catch (error) {
    logger.error({ err: error }, "[billing/routes] Get subscription error");
    sendError(
      res,
      500,
      "SUBSCRIPTION_ERROR",
      "Failed to get subscription info"
    );
  }
}

/**
 * GET /api/v1/billing/usage/:organizationId
 * Get usage info for an organization.
 */
async function getUsageHandler(req: Request, res: Response): Promise<void> {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      sendError(res, 400, "VALIDATION_ERROR", "Organization ID is required");
      return;
    }

    const [sessions, storage, duration] = await Promise.all([
      billingService.checkUsageLimit(organizationId, "sessions"),
      billingService.checkUsageLimit(organizationId, "storage"),
      billingService.checkUsageLimit(organizationId, "duration"),
    ]);

    sendSuccess(res, {
      usage: {
        sessions,
        storage,
        maxSessionDuration: duration,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "[billing/routes] Get usage error");
    sendError(res, 500, "USAGE_ERROR", "Failed to get usage info");
  }
}

/**
 * POST /api/v1/billing/webhook
 * Handle Stripe webhook events.
 */
async function webhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      sendError(res, 400, "WEBHOOK_ERROR", "Missing Stripe signature");
      return;
    }

    // req.body should be raw buffer for webhook verification
    await billingService.handleWebhook(req.body, signature);

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error({ err: error }, "[billing/routes] Webhook error");
    sendError(
      res,
      400,
      "WEBHOOK_ERROR",
      error instanceof Error ? error.message : "Webhook processing failed"
    );
  }
}

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createBillingRouter(): Router {
  const router = Router();

  // Public routes
  router.get("/plans", getPlansHandler);

  // Protected routes
  router.post(
    "/checkout-session",
    authenticateToken,
    createCheckoutSessionHandler
  );

  router.post("/portal", authenticateToken, createPortalSessionHandler);

  router.get(
    "/subscription/:organizationId",
    authenticateToken,
    getSubscriptionHandler
  );

  router.get("/usage/:organizationId", authenticateToken, getUsageHandler);

  // Webhook route (uses raw body parser)
  router.post("/webhook", webhookHandler);

  return router;
}

export const billingRouter = createBillingRouter();
