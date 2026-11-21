import type { Request, Response } from "express";

import { users, menus } from "../../config/db.config.ts";
import type {  AuthedRequest } from "../../middleware/auth.middleware.ts";

const FREE_MENU_LIMIT = 3;

export const getVendorSubscription = async (
  req: Request,
  res: Response
) => {
  try {
    // 1. Authentication
    const authUser = (req as  AuthedRequest).user;

    if (!authUser?.email) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    // 2. Vendor role verification
    if (authUser.role !== "vendor") {
      return res.status(403).json({
        success: false,
        message:
          "Only vendors can access subscription information.",
      });
    }

    // 3. Find logged-in vendor
    const vendor = await users.findOne({
      email: authUser.email,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
    }

    // 4. Get subscription
    // Existing vendors without subscription are treated as Free
    const subscription = vendor.subscription ?? "free";

    const isPremium = subscription === "premium";

    // 5. Count active menu items
    // Only Approved menus are considered active
    const activeMenuItems = await menus.countDocuments({
      vendorId: vendor._id,
      status: "Approved",
    });

    // 6. Menu limit
    const menuLimit = isPremium ? null : FREE_MENU_LIMIT;

    // 7. Can vendor add another active menu?
    const canAddMenu = isPremium || activeMenuItems < FREE_MENU_LIMIT;

    // 8. Response
    return res.status(200).json({
      success: true,
      data: {
        plan: subscription,
        planName: isPremium ? "Premium" : "Free",

        activeMenuItems,

        menuLimit,

        isPremium,

        canAddMenu,

        features: isPremium
          ? [
              "Unlimited active menu items",
              "Premium vendor badge",
              "Featured menu placement",
              "Basic vendor dashboard",
              "Order management",
            ]
          : [
              "Maximum 3 active menu items",
              "Basic vendor dashboard",
              "Order management",
            ],
      },
    });
  } catch (error) {
    console.error(
      "Get vendor subscription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch subscription information.",
    });
  }
};