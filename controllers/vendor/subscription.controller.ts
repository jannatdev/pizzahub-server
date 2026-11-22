
import type { Request, Response } from "express";

import { users, menus } from "../../config/db.config.ts";
import type { AuthedRequest } from "../../middleware/auth.middleware.ts";

const FREE_MENU_LIMIT = 3;

export const getVendorSubscription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get authenticated vendor from JWT middleware
    const authUser = (req as AuthedRequest).user;

    if (!authUser?.email) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
    }

    // Find logged-in vendor
    const vendor = await users.findOne({
      email: authUser.email,
      role: "vendor",
    });

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
      return;
    }

    // Get subscription (default: Free)
    const subscription = vendor.subscription ?? "free";

    const isPremium = subscription === "premium";

    // Count approved menu items
    const activeMenuItems = await menus.countDocuments({
      vendorId: vendor._id,
      status: "Approved",
    });

    // Menu limit
    const menuLimit = isPremium ? null : FREE_MENU_LIMIT;

    // Check menu creation permission
    const canAddMenu =
      isPremium || activeMenuItems < FREE_MENU_LIMIT;

    res.status(200).json({
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
    console.error("Get vendor subscription error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription information.",
    });
  }
};
