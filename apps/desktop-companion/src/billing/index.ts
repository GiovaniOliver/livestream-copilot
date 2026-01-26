/**
 * Billing Module
 *
 * Stripe-based subscription billing for FluxBoard.
 *
 * @module billing
 */

export { billingService, PLANS } from "./service.js";
export type {
  PlanConfig,
  CheckoutSessionResult,
  PortalSessionResult,
  SubscriptionInfo,
} from "./service.js";

export { billingRouter, createBillingRouter } from "./routes.js";
