
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { menus } from "../../config/db.config.ts";

// Get all submitted menu items


type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

export const getAllMenuItems = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser?.email) {
      // Missing/invalid session cookie → unauthenticated (401)
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    if (authUser.role !== "admin") {
      // Signed in, but not an admin → unauthorized (403)
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Admins moderate EVERY menu item (Pending / Approved / Rejected) — this
    // is the review queue, so no status or active filtering here.
    const allMenus = await menus
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: allMenus.length,
      menus: allMenus,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch menus",
    });
  }
};


// Approve menu item
export const approveMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser?.email) {
      // Missing/invalid session cookie → unauthenticated (401)
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    if (authUser.role !== "admin") {
      // Signed in, but not an admin → unauthorized (403)
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const id = req.params.id;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID",
      });
    }

    const result = await menus.updateOne(
  { _id: new ObjectId(id) },
  {
    $set: {
      status: "Approved",
      isActive: true,
      updatedAt: new Date(),
    },
  }
);

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu approved successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve menu",
    });
  }
};


// Reject menu item
export const rejectMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;

    if (!authUser?.email) {
      // Missing/invalid session cookie → unauthenticated (401)
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    if (authUser.role !== "admin") {
      // Signed in, but not an admin → unauthorized (403)
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const id = req.params.id;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID",
      });
    }

    const result = await menus.updateOne(
  { _id: new ObjectId(id) },
  {
    $set: {
      status: "Rejected",
      isActive: false,
      updatedAt: new Date(),
    },
  }
);

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu rejected successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject menu",
    });
  }
};

// Delete menu item
export const deleteMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = (req as AuthenticatedRequest).user;

    // Admin check
    if (!authUser?.email) {
      // Missing/invalid session cookie → unauthenticated (401)
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    if (authUser.role !== "admin") {
      // Signed in, but not an admin → unauthorized (403)
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Get menu ID
    const id = req.params.id;

    // Validate MongoDB ObjectId
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID",
      });
    }

    // Delete menu item
    const result = await menus.deleteOne({
      _id: new ObjectId(id),
    });

    // Menu not found
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Successfully deleted
    return res.status(200).json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    console.error("Delete menu error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete menu",
    });
  }
};