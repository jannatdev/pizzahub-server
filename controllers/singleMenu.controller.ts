
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { menus, users } from "../config/db.config.ts";

export const getMenuDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Validate menu ID
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID.",
      });
      return;
    }

    // 2. Find menu item (any status)
    const menuItem = await menus.findOne({
      _id: new ObjectId(id),
    });

    if (!menuItem) {
      res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
      return;
    }

    // 3. Get vendor profile image
    let vendorImage = "";

    if (menuItem.vendorId) {
      const vendor = await users.findOne(
        {
          _id: menuItem.vendorId,
        },
        {
          projection: {
            image: 1,
          },
        }
      );

      vendorImage =
        typeof vendor?.image === "string"
          ? vendor.image
          : "";
    }

    // 4. Return menu details
    res.status(200).json({
      success: true,
      message: "Menu item fetched successfully.",
      data: {
        ...menuItem,
        vendorImage,
      },
    });
  } catch (error) {
    console.error("Get menu details error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch menu item.",
    });
  }
};
