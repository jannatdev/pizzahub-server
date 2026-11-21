import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { menus, users } from "../config/db.config.ts";

export const getMenuDetails = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID.",
      });
    }

    // Find menu item (any status — the UI explains when ordering is unavailable)
    const menuItem = await menus.findOne({
      _id: new ObjectId(id),
    });

    // Menu item not found
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    // Join the vendor's profile image (same as the browse API) so the
    // details page can render a real avatar.
    let vendorImage = "";

    if (menuItem.vendorId) {
      const vendor = await users.findOne(
        { _id: menuItem.vendorId },
        { projection: { image: 1 } }
      );

      vendorImage =
        typeof vendor?.image === "string" ? vendor.image : "";
    }

    return res.status(200).json({
      success: true,
      message: "Menu item fetched successfully.",
      data: {
        ...menuItem,
        vendorImage,
      },
    });
  } catch (error) {
    console.error("Get menu details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menu item.",
    });
  }
};