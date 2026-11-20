
import express from "express";
import Stripe from "stripe"; 
import { payments, users } from "../config/db.config.ts"; 
import { ObjectId } from "mongodb";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); 

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

    const existingPayment = await payments.findOne({ sessionId });

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

      const result = await payments.insertOne(payment);
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
        : "Payment verification failed.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
});

export default router;
