
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { orders } from "../../config/db.config.ts";
import type { AuthedRequest } from "../../middleware/auth.middleware.ts";

// ========================================
// HELPER: SUPPORT STRING AND OBJECTID
// ========================================
const getVendorIdValues = (vendorId: string) => {
  const values: (string | ObjectId)[] = [vendorId];

  if (ObjectId.isValid(vendorId)) {
    values.push(new ObjectId(vendorId));
  }

  return values;
};

// ========================================
// GET VENDOR ORDERS
// ========================================
export const getVendorOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get authenticated vendor from JWT middleware
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
    }

    const vendorId = String(user.id);
    const vendorIds = getVendorIdValues(vendorId);

    const vendorOrders = await orders
      .find({
        vendorId: { $in: vendorIds },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Vendor orders fetched successfully.",
      data: vendorOrders,
    });
  } catch (error) {
    console.error("Get vendor orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor orders.",
    });
  }
};

// ========================================
// UPDATE VENDOR ORDER STATUS
// ========================================
export const updateVendorOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get authenticated vendor from JWT middleware
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
    }

    const id = String(req.params.id);
    const status = req.body.status;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
      return;
    }

    if (
      typeof status !== "string" ||
      !["Accepted", "Rejected"].includes(status)
    ) {
      res.status(400).json({
        success: false,
        message: "Status must be Accepted or Rejected.",
      });
      return;
    }

    const vendorId = String(user.id);
    const vendorIds = getVendorIdValues(vendorId);

    // Ownership check: only this vendor's pending order can be updated
    const result = await orders.updateOne(
      {
        _id: new ObjectId(id),
        vendorId: { $in: vendorIds },
        status: "Pending",
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message:
          "Order not found, does not belong to you, or is no longer pending.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Order ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    console.error("Update vendor order status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update order status.",
    });
  }
};
