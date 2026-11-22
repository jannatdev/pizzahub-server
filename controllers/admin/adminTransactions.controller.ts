
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { transactions, users } from "../../config/db.config.ts";

export const getAdminTransactions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
  
    const records = await transactions
      .find({})
      .sort({ paymentDate: -1 })
      .toArray();

    // Collect vendor IDs.
    const vendorIds: ObjectId[] = [];

    for (const record of records) {
      const id = record.userId;

      if (typeof id === "string" && ObjectId.isValid(id)) {
        vendorIds.push(new ObjectId(id));
      }
    }

    // Fetch vendors in one query.
    const vendors = await users
      .find({ _id: { $in: vendorIds } })
      .toArray();

    const vendorById = new Map(
      vendors.map((vendor) => [String(vendor._id), vendor])
    );


   
    // Format payment records.
    const data = records.map((record) => {
      const vendor =
        typeof record.userId === "string"
          ? vendorById.get(record.userId)
          : undefined;

      return {
        id: String(record._id),

        vendorName:
          vendor?.name ?? record.customer_email ?? "Unknown vendor",

        vendorEmail:
          vendor?.email ?? record.customer_email ?? "—",

        plan: record.plan === "free" ? "Free" : "Premium",

        amount:
          typeof record.amount_total === "number"
            ? record.amount_total
            : null,

        currency:
          typeof record.currency === "string"
            ? record.currency
            : "usd",

        status:
          record.payment_status ?? record.status ?? "unknown",

        date: record.paymentDate ?? null,
      };
    });

    res.status(200).json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Admin transactions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions.",
    });
  }
};
