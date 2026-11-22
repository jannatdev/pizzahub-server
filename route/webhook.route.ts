import express from "express";
import Stripe from "stripe";
import { transactions, users } from "../config/db.config.ts";
import { ObjectId } from "mongodb";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30",
});

/**
 * Stripe webhook endpoint.
 * Must be configured in the Stripe Dashboard:
 *   URL: https://your-domain.com/api/webhook/stripe
 *   Events: checkout.session.completed, checkout.session.expired
 */
router.post(
  "/stripe",
  // Make sure this body parser runs BEFORE express.json() limit issues
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed.`, err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Retrieve metadata: { userId: string, vendorId?: string }
      const { userId, vendorId } = session.metadata || {};

      if (!userId) {
        return res.status(400).json({ error: "Missing userId in metadata." });
      }

      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid userId format." });
      }

      // Determine which user to update based on metadata
      // If vendorId is provided, we update the vendor; otherwise the customer
      let targetUserId: ObjectId;
      let updateData: { subscription: string; subscriptionExpiresAt?: Date } = {
        subscription: "premium",
      };

      if (vendorId && ObjectId.isValid(vendorId)) {
        targetUserId = new ObjectId(vendorId);
        // Also update or insert a transaction record
        const paymentRecord = {
          vendorId: new ObjectId(vendorId),
          plan: "premium",
          amount: session.amount_total
            ? Number(session.amount_total) / 100
            : 0,
          currency: "usd",
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription
            ? String(session.subscription)
            : "",
          status: "succeeded",
          createdAt: new Date(),
        };

        // Check if a transaction already exists for this session
        const existingTransaction = await transactions.findOne({
          stripeSessionId: session.id,
        });

        if (!existingTransaction) {
          await transactions.insertOne(paymentRecord);
        }

        // Set expiresAt 1 year from now for premium
        updateData.subscriptionExpiresAt = new Date();
        updateData.subscriptionExpiresAt?.setFullYear(
          updateData.subscriptionExpiresAt.getFullYear() + 1
        );
      } else {
        targetUserId = new ObjectId(userId);

        // Update the user's subscription
        updateData.subscriptionExpiresAt = new Date();
        updateData.subscriptionExpiresAt?.setFullYear(
          updateData.subscriptionExpiresAt.getFullYear() + 1
        );

        // Save transaction record (customer purchased premium for themselves? or vendor?)
        // In this flow, the vendor pays for their own premium upgrade
        // but the metadata userId is the vendor's own user ID
        const paymentRecord = {
          vendorId: ObjectId.isValid(vendorId) ? new ObjectId(vendorId) : new ObjectId(userId),
          plan: "premium",
          amount: session.amount_total
            ? Number(session.amount_total) / 100
            : 0,
          currency: "usd",
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription
            ? String(session.subscription)
            : "",
          status: "succeeded",
          createdAt: new Date(),
        };

        const existingTransaction = await transactions.findOne({
          stripeSessionId: session.id,
        });

        if (!existingTransaction) {
          await transactions.insertOne(paymentRecord);
        }
      }

      // Update the user's subscription
      const updateResult = await users.updateOne(
        { _id: targetUserId },
        { $set: updateData }
      );

      console.log(
        `✅ Subscription updated for user ${targetUserId}: `,
        updateResult.modifiedCount > 0 ? "premium activated" : "no changes"
      );
    }

    // Handle expired session
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`ℹ️ Checkout session expired: ${session.id}`);
      // Optionally, you could notify the user or clean up cart state
    }

    res.json({ received: true });
  }
);

export default router;