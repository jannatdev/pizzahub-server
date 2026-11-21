

import type { Request, Response } from "express";
import { menus, users } from "../config/db.config.ts";

const FREE_MENU_LIMIT = 3;

const allowedCategories = [
  "Classic Pizzas",
  "Vegetarian Pizzas",
  "Meat Lovers",
  "Specialty / Gourmet Pizzas",
  "Sides & Appetizers",
  "Beverages & Desserts",
];

type AuthUser = {
  email?: string;
  role?: string;
};

type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

// ------------------------------------------
// GET /api/menu/vendor/count
// Check logged-in vendor's menu count
// ------------------------------------------

export const getVendorMenuCount = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser?.email) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    if (authUser.role !== "vendor") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access menu information.",
      });
    }

    const vendor = await users.findOne({
      email: authUser.email,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
    }

    // FIXED: Get vendor subscription
    const subscription = vendor.subscription ?? "free";
    const isPremium = subscription === "premium";

    // FIXED: Count active menus
    const count = await menus.countDocuments({
      vendorId: vendor._id,
      status: {
        $in: ["Pending", "Approved"],
      },
    });

    return res.status(200).json({
      success: true,
      count,
      freeLimit: FREE_MENU_LIMIT,
      subscription,
      isPremium,
      isPaid: isPremium,
      limitReached: !isPremium && count >= FREE_MENU_LIMIT,
      canAddMenu: isPremium || count < FREE_MENU_LIMIT,
    });
  } catch (error) {
    console.error("Get vendor menu count error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get menu count.",
    });
  }
};

// ------------------------------------------
// POST /api/menu/:email
// Create menu item for logged-in vendor
// ------------------------------------------

export const createMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    // 1. Authentication
    const authUser = (req as AuthenticatedRequest).user;

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
        message: "Only vendors can add menu items.",
      });
    }

    // 3. Verify ownership
    const requestedEmail = String(req.params.email || "")
      .trim()
      .toLowerCase();

    if (requestedEmail !== authUser.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message:
          "You can only add menu items to your own account.",
      });
    }

    // 4. Find vendor
    const vendor = await users.findOne({
      email: authUser.email,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
    }

    // 5. Extract form data
    const {
      itemName,
      category,
      description,
      price,
      location,
      imageUrl,
    } = req.body;

    // 6. Required field validation
    if (
      typeof itemName !== "string" ||
      !itemName.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      price === undefined ||
      typeof location !== "string" ||
      !location.trim() ||
      typeof imageUrl !== "string" ||
      !imageUrl.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // 7. Category validation
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu category.",
      });
    }

    // 8. Price validation
    const menuPrice = Number(price);

    if (!Number.isFinite(menuPrice) || menuPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0.",
      });
    }

    // 9. Subscription verification
    // Existing vendors without a subscription are treated as Free
    const subscription = vendor.subscription ?? "free";
    const isPremium = subscription === "premium";

    
    if (!isPremium) {
      const activeMenuCount = await menus.countDocuments({
        vendorId: vendor._id,
        status: "Approved",
      });

      if (activeMenuCount >= FREE_MENU_LIMIT) {
        return res.status(403).json({
          success: false,
          code: "MENU_LIMIT_REACHED",
          message:
            "You have reached the maximum of 3 active menu items on the Free plan. Upgrade to Premium to add unlimited menu items.",
          count: activeMenuCount,
          freeLimit: FREE_MENU_LIMIT,
          subscription,
          isPremium,
        });
      }
    }

    // 11. Prepare menu document
    const newMenuItem = {
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      price: menuPrice,
      location: location.trim(),
      imageUrl: imageUrl.trim(),

      // Vendor information
      vendorId: vendor._id,
      vendorName: vendor.name || "",
      vendorEmail: vendor.email,

      // Admin approval required
      status: "Pending",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 12. Save to MongoDB
    const result = await menus.insertOne(newMenuItem);

    return res.status(201).json({
      success: true,
      message: "Menu item created successfully.",
      menuItem: {
        _id: result.insertedId,
        ...newMenuItem,
      },
    });
  } catch (error) {
    console.error("Create menu item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create menu item.",
    });
  }
};
// Get Premium Vendor
export const getVendorPremium = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser?.email) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    if (authUser.role !== "vendor") {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access this information.",
      });
    }

    const vendor = await users.findOne({
      email: authUser.email,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    const subscription = vendor.subscription ?? "free";
    const isPremium = subscription === "premium";

    return res.status(200).json({
      success: true,
      subscription,
      isPremium,
      message: isPremium
        ? "You are a Premium vendor."
        : "You are using the Free plan.",
    });
  } catch (error) {
    console.error("Premium status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check premium status.",
    });
  }
};