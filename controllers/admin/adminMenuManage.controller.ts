

import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { menus } from "../../config/db.config.ts";

// ------------------------------------
// GET ALL MENU ITEMS
// ------------------------------------

export const getAllMenuItems = async (
  req: Request,
  res: Response
) => {
  try {
    const allMenus = await menus
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: allMenus.length,
      data: allMenus,
    });

  } catch (error) {
    console.error("Get all menus error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menus.",
    });
  }
};

// ------------------------------------
// APPROVE MENU ITEM
// ------------------------------------

export const approveMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID.",
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
        message: "Menu not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu approved successfully.",
    });

  } catch (error) {
    console.error("Approve menu error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve menu.",
    });
  }
};

// ------------------------------------
// REJECT MENU ITEM
// ------------------------------------

export const rejectMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID.",
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
        message: "Menu not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu rejected successfully.",
    });

  } catch (error) {
    console.error("Reject menu error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject menu.",
    });
  }
};

// ------------------------------------
// DELETE MENU ITEM
// ------------------------------------

export const deleteMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu ID.",
      });
    }

    const result = await menus.deleteOne({
      _id: new ObjectId(id),
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu deleted successfully.",
    });

  } catch (error) {
    console.error("Delete menu error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete menu.",
    });
  }
};
