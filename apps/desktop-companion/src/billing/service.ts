/**
 * Stripe Billing Service
 *
 * Provides subscription management functionality:
 * - Checkout session creation
 * - Subscription management
 * - Customer portal access
 * - Webhook handling
 * - Usage tracking
 *
 * @module billing/service
 */

import Stripe from "stripe";
import { config } from "../config/index.js";
import { prisma } from "../db/index.js";
import { logger } from "../logger/index.js";

// Import types from generated prisma
type SubscriptionTier = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "PAUSED";

// =============================================================================
// STRIPE CLIENT
// =============================================================================

// Only initialize Stripe if the API key is provided
const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    })
  : null;

// =============================================================================
// TYPES
// =============================================================================

export interface PlanConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  features: string[];
  limits: {
    maxSessions: number;
    maxSessionDuration: number;
    maxStorageMB: number;
    maxTeamMembers: number;
    apiAccess: boolean;
  };
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface PortalSessionResult {
  url: string;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  features: string[];
}

// =============================================================================
// PLAN CONFIGURATIONS
// =============================================================================

export const PLANS: Record<string, PlanConfig> = {
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    description: "For individual creators getting started",
    monthlyPriceId: config.STRIPE_STARTER_MONTHLY_PRICE_ID || "",
    yearlyPriceId: config.STRIPE_STARTER_YEARLY_PRICE_ID || "",
    features: [
      "50 sessions/month",
      "2 hour max session",
      "5GB storage",
      "Basic transcription",
      "Export to common formats",
    ],
    limits: {
      maxSessions: 50,
      maxSessionDuration: 120,
      maxStorageMB: 5000,
      maxTeamMembers: 0,
      apiAccess: false,
    },
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    description: "For professional streamers and podcasters",
    monthlyPriceId: config.STRIPE_PRO_MONTHLY_PRICE_ID || "",
    yearlyPriceId: config.STRIPE_PRO_YEARLY_PRICE_ID || "",
    features: [
      "Unlimited sessions",
      "Unlimited session duration",
      "50GB storage",
      "Advanced AI features",
      "Team collaboration (5 members)",
      "API access",
      "Priority support",
    ],
    limits: {
      maxSessions: -1,
      maxSessionDuration: -1,
      maxStorageMB: 50000,
      maxTeamMembers: 5,
      apiAccess: true,
    },
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Enterprise",
    description: "For large teams and organizations",
    monthlyPriceId: config.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || "",
    yearlyPriceId: config.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || "",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Unlimited team members",
      "Custom branding",
      "SSO integration",
      "Audit logs",
      "Dedicated support",
      "SLA guarantee",
    ],
    limits: {
      maxSessions: -1,
      maxSessionDuration: -1,
      maxStorageMB: -1,
      maxTeamMembers: -1,
      apiAccess: true,
    },
  },
};

// =============================================================================
// BILLING SERVICE
// =============================================================================

/**
 * Helper to ensure Stripe is configured before using billing features.
 */
function ensureStripeConfigured(): asserts stripe is Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables to enable billing features."
    );
  }
}

class BillingService {
  /**
   * Creates a Stripe checkout session for subscription.
   */
  async createCheckoutSession(
    organizationId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSessionResult> {
    ensureStripeConfigured();

    // Get or create Stripe customer
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true, owner: true },
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    let customerId = org.subscription?.stripeCustomerId;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: org.owner.email,
        name: org.name,
        metadata: {
          organizationId: org.id,
          userId: org.ownerId,
        },
      });
      customerId = customer.id;

      // Update subscription record
      await prisma.subscription.upsert({
        where: { organizationId },
        create: {
          organizationId,
          stripeCustomerId: customerId,
          tier: "FREE",
          status: "ACTIVE",
        },
        update: {
          stripeCustomerId: customerId,
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
      },
      subscription_data: {
        metadata: {
          organizationId,
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Creates a Stripe customer portal session.
   */
  async createPortalSession(
    organizationId: string,
    returnUrl: string
  ): Promise<PortalSessionResult> {
    ensureStripeConfigured();

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error("No billing account found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Gets subscription info for an organization.
   */
  async getSubscriptionInfo(organizationId: string): Promise<SubscriptionInfo> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      return {
        tier: "FREE",
        status: "ACTIVE",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        features: ["5 sessions/month", "30 min max session", "500MB storage"],
      };
    }

    const plan = PLANS[subscription.tier];

    return {
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      features: plan?.features || [],
    };
  }

  /**
   * Handles Stripe webhook events.
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    ensureStripeConfigured();

    const webhookSecret = config.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdate(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  }

  /**
   * Handles successful checkout completion.
   */
  private async handleCheckoutComplete(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const organizationId = session.metadata?.organizationId;
    if (!organizationId) return;

    // Subscription will be updated via subscription.created/updated webhook
    logger.info(`[billing] Checkout completed for org ${organizationId}`);
  }

  /**
   * Handles subscription creation or update.
   */
  private async handleSubscriptionUpdate(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    // Determine tier from price
    const priceId = subscription.items.data[0]?.price.id;
    const tier = this.getTierFromPriceId(priceId);

    // Map Stripe status to our status
    const status = this.mapStripeStatus(subscription.status);

    await prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        tier,
        status,
        stripeSubId: subscription.id,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        tier,
        status,
        stripeSubId: subscription.id,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    logger.info(
      `[billing] Subscription updated for org ${organizationId}: ${tier} (${status})`
    );
  }

  /**
   * Handles subscription deletion/cancellation.
   */
  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const organizationId = subscription.metadata?.organizationId;
    if (!organizationId) return;

    await prisma.subscription.update({
      where: { organizationId },
      data: {
        tier: "FREE",
        status: "CANCELED",
        stripeSubId: null,
        stripePriceId: null,
      },
    });

    logger.info(`[billing] Subscription canceled for org ${organizationId}`);
  }

  /**
   * Handles successful payment.
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) return;

    // Reset usage counters on successful payment
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          usageThisMonth: { sessions: 0, storageMB: 0 },
        },
      });
    }

    logger.info(`[billing] Payment succeeded for customer ${customerId}`);
  }

  /**
   * Handles failed payment.
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) return;

    await prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId },
      data: { status: "PAST_DUE" },
    });

    logger.info(`[billing] Payment failed for customer ${customerId}`);
  }

  /**
   * Maps a Stripe price ID to a subscription tier.
   */
  private getTierFromPriceId(priceId: string): SubscriptionTier {
    for (const [tier, plan] of Object.entries(PLANS)) {
      if (
        plan.monthlyPriceId === priceId ||
        plan.yearlyPriceId === priceId
      ) {
        return tier as SubscriptionTier;
      }
    }
    return "FREE";
  }

  /**
   * Maps Stripe subscription status to our status.
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case "active":
      case "trialing":
        return "ACTIVE";
      case "past_due":
        return "PAST_DUE";
      case "canceled":
      case "unpaid":
        return "CANCELED";
      case "paused":
        return "PAUSED";
      default:
        return "ACTIVE";
    }
  }

  /**
   * Checks if an organization has access to a feature.
   */
  async hasFeatureAccess(
    organizationId: string,
    feature: string
  ): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    const tier = subscription?.tier || "FREE";
    const plan = PLANS[tier];

    if (!plan) {
      // FREE tier checks
      switch (feature) {
        case "api_access":
          return false;
        case "team_access":
          return false;
        default:
          return true;
      }
    }

    // Check specific feature
    switch (feature) {
      case "api_access":
        return plan.limits.apiAccess;
      case "team_access":
        return plan.limits.maxTeamMembers > 0;
      default:
        return true;
    }
  }

  /**
   * Checks if organization is within usage limits.
   */
  async checkUsageLimit(
    organizationId: string,
    limitType: "sessions" | "storage" | "duration"
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    const tier = subscription?.tier || "FREE";
    const plan = PLANS[tier];
    const usage = (subscription?.usageThisMonth as Record<string, number>) || {
      sessions: 0,
      storageMB: 0,
    };

    let current = 0;
    let max = 0;

    switch (limitType) {
      case "sessions":
        current = usage.sessions || 0;
        max = plan?.limits.maxSessions ?? 5;
        break;
      case "storage":
        current = usage.storageMB || 0;
        max = plan?.limits.maxStorageMB ?? 500;
        break;
      case "duration":
        current = 0; // Duration is per-session, not cumulative
        max = plan?.limits.maxSessionDuration ?? 30;
        break;
    }

    // -1 means unlimited
    const allowed = max === -1 || current < max;

    return { allowed, current, max };
  }

  /**
   * Increments usage counter.
   */
  async incrementUsage(
    organizationId: string,
    type: "sessions" | "storageMB",
    amount: number = 1
  ): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) return;

    const usage = (subscription.usageThisMonth as Record<string, number>) || {
      sessions: 0,
      storageMB: 0,
    };

    usage[type] = (usage[type] || 0) + amount;

    await prisma.subscription.update({
      where: { organizationId },
      data: { usageThisMonth: usage },
    });
  }
}

export const billingService = new BillingService();
