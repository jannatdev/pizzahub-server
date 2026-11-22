
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { users, menus, orders } from "../../config/db.config.ts";
import type { AuthedRequest } from "../../middleware/auth.middleware.ts";

export const getVendorOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authUser = (req as AuthedRequest).user;

    if (!authUser?.id) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
    }

    // Find authenticated vendor using JWT user ID
    const vendorId = String(authUser.id);

    const idConditions: any[] = [
      { _id: vendorId },
    ];

    if (ObjectId.isValid(vendorId)) {
      idConditions.push({
        _id: new ObjectId(vendorId),
      });
    }

    const vendor = await users.findOne({
      $or: idConditions,
      role: "vendor",
    });

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
      return;
    }

    // Get dashboard statistics
    const [
      totalMenuItems,
      activeMenuItems,
      pendingOrders,
      acceptedOrders,
    ] = await Promise.all([
      menus.countDocuments({
        vendorId: vendor._id,
      }),

      menus.countDocuments({
        vendorId: vendor._id,
        status: "Approved",
        isActive: { $ne: false },
      }),

      orders.countDocuments({
        vendorId: vendor._id,
        status: "Pending",
      }),

      orders.countDocuments({
        vendorId: vendor._id,
        status: "Accepted",
      }),
    ]);

    // Get subscription plan
    const plan = vendor.subscription ?? "free";

    res.status(200).json({
      success: true,
      data: {
        totalMenuItems,
        activeMenuItems,
        pendingOrders,
        acceptedOrders,
        plan,
        planName: plan === "premium" ? "Premium" : "Free",
      },
    });
  } catch (error) {
    console.error("Vendor overview error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch the dashboard overview.",
    });
  }
};
