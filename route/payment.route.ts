import express from "express";
import Stripe from "stripe";
import { transactions, users } from "../config/db.config.ts";
import { ObjectId } from "mongodb";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-11-18.endive",
});

// Helper: create a Stripe Checkout Session for vendor Premium upgrade
const createCheckoutSession = async (vendorId: string, userId: string) => {
  const vendor = await users.findOne({ _id: new ObjectId(vendorId) });

  if (!vendor) {
    throw new Error("Vendor not found");
  }

 const session = await stripe.checkout.sessions.create({
  
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Premium Subscription - PizzaHub",
            description: "Unlimited menu items, Premium badge, featured placement",
          },
          unit_amount: 999, // $9.99
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      userId,
      vendorId,
    },
    success_url: `${process.env.CLIENT_URL}/payment-success?sessionId={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
  });

  return session;
};

router.post("/checkout_verify", async (req, res) => {
  try {
    const { sessionId } = req.body ?? {};

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const {
      status,
      payment_status,
      customer_email,
      metadata,
      payment_intent,
    } = await stripe.checkout.sessions.retrieve(sessionId);

    if (status !== "complete" || payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment is not complete yet.",
      });
    }

    const userId = metadata?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "Checkout session has no userId metadata, so the buyer cannot be identified.",
      });
    }

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    // One payment record per checkout session — the success page can be
    // refreshed without inserting duplicates.
    let paymentId: unknown;

    const existingPayment = await transactions.findOne({ sessionId });

    if (existingPayment) {
      paymentId = existingPayment._id;
    } else {
      const payment = {
        sessionId,
        status,
        payment_status,
        customer_email,
        userId,
        paymentDate: new Date(),
        payment_intent,
      };

      const result = await transactions.insertOne(payment);
      paymentId = result.insertedId;
    }

    const query = {
      _id: new ObjectId(userId),
    };

    const updatedDoc = {
      $set: {
        subscription: "premium",
      },
    };

    const updateResult = await users.updateOne(query, updatedDoc);

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      paymentId,
      userUpdated: updateResult.modifiedCount > 0,
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Payment verification failed."

    return res.status(500).json({
      success: false,
      message,
    });
  }
});

// CREATE Checkout Session for vendor Premium upgrade
router.post("/checkout", async (req, res) => {
  try {
    const { vendorId, userId } = req.body ?? {};

    if (!vendorId || !userId) {
      return res.status(400).json({
        success: false,
        message: "vendorId and userId are required.",
      });
    }

    const vendor = await users.findOne({ _id: new ObjectId(vendorId) });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    const session = await stripe.checkout.sessions.create({
    
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Premium Subscription - PizzaHub",
              description: "Unlimited menu items, Premium badge, featured placement",
            },
            unit_amount: 999, // $9.99
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        userId,
        vendorId,
      },
      success_url: `${process.env.CLIENT_URL}/payment-success?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to create checkout session."

    return res.status(500).json({
      success: false,
      message,
    });
  }
});

export default router;