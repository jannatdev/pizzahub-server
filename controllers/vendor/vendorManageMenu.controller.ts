
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { menus, users } from "../../config/db.config.ts";
import type { AuthedRequest } from "../../middleware/auth.middleware.ts";

// ========================================
// HELPER: GET AUTHENTICATED VENDOR
// ========================================
const getVendor = async (req: Request) => {
  const authUser = (req as AuthedRequest).user;

  if (!authUser?.id) {
    return null;
  }

  const vendorId = String(authUser.id);

  if (!ObjectId.isValid(vendorId)) {
    return null;
  }

  const vendor = await users.findOne({
    _id: new ObjectId(vendorId),
    role: "vendor",
  });

  return vendor;
};

// ========================================
// GET ALL VENDOR MENU ITEMS
// ========================================
export const getMyMenuItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
      return;
    }

    const status = String(req.query.status || "all");

    const filter: Record<string, any> = {
      vendorId: vendor._id,
    };

    if (["Pending", "Approved", "Rejected"].includes(status)) {
      filter.status = status;
    } else if (status !== "all") {
      res.status(400).json({
        success: false,
        message: "Invalid status filter",
      });
      return;
    }

    const items = await menus
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Vendor menu items fetched successfully",
      total: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get vendor menu items:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch menu items",
    });
  }
};

// ========================================
// GET SINGLE VENDOR MENU ITEM
// ========================================
export const getMyMenuItemById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
      return;
    }

    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
      return;
    }

    const item = await menus.findOne({
      _id: new ObjectId(id),
      vendorId: vendor._id,
    });

    if (!item) {
      res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Menu item details fetched successfully",
      data: item,
    });
  } catch (error) {
    console.error("Get vendor menu details:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch menu details",
    });
  }
};

// ========================================
// UPDATE VENDOR MENU ITEM
// ========================================
export const updateMyMenuItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
      return;
    }

    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
      return;
    }

    // Verify item ownership
    const existingItem = await menus.findOne({
      _id: new ObjectId(id),
      vendorId: vendor._id,
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
      return;
    }

    const {
      itemName,
      category,
      description,
      price,
      location,
      imageUrl,
    } = req.body;

    // Only allow these fields to be updated
    const updateData: Record<string, any> = {};

    if (itemName !== undefined) {
      if (typeof itemName !== "string" || !itemName.trim()) {
        res.status(400).json({
          success: false,
          message: "Item name is required",
        });
        return;
      }

      updateData.itemName = itemName.trim();
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        res.status(400).json({
          success: false,
          message: "Category is required",
        });
        return;
      }

      updateData.category = category.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        res.status(400).json({
          success: false,
          message: "Description is required",
        });
        return;
      }

      updateData.description = description.trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        res.status(400).json({
          success: false,
          message: "Price must be greater than zero",
        });
        return;
      }

      updateData.price = numericPrice;
    }

    if (location !== undefined) {
      if (typeof location !== "string" || !location.trim()) {
        res.status(400).json({
          success: false,
          message: "Location is required",
        });
        return;
      }

      updateData.location = location.trim();
    }

    if (imageUrl !== undefined) {
      if (typeof imageUrl !== "string" || !imageUrl.trim()) {
        res.status(400).json({
          success: false,
          message: "Image URL is required",
        });
        return;
      }

      updateData.imageUrl = imageUrl.trim();
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid update fields provided",
      });
      return;
    }

    updateData.updatedAt = new Date();

    await menus.updateOne(
      {
        _id: new ObjectId(id),
        vendorId: vendor._id,
      },
      {
        $set: updateData,
      }
    );

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
    });
  } catch (error) {
    console.error("Update vendor menu item:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update menu item",
    });
  }
};

// ========================================
// DELETE VENDOR MENU ITEM
// ========================================
export const deleteMyMenuItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
      return;
    }

    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
      return;
    }

    const result = await menus.deleteOne({
      _id: new ObjectId(id),
      vendorId: vendor._id,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor menu item:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete menu item",
    });
  }
};

// ========================================
// UPDATE MENU AVAILABILITY
// ========================================
export const updateMenuAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: "Vendor account not found.",
      });
      return;
    }

    const id = String(req.params.id);
    const { isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
      return;
    }

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
      return;
    }

    // Only approved items can change availability
    const result = await menus.updateOne(
      {
        _id: new ObjectId(id),
        vendorId: vendor._id,
        status: "Approved",
      },
      {
        $set: {
          isActive,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      const item = await menus.findOne({
        _id: new ObjectId(id),
        vendorId: vendor._id,
      });

      if (!item) {
        res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: "Only approved items can manage availability",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: isActive
        ? "Menu item is now available"
        : "Menu item is now unavailable",
      isActive,
    });
  } catch (error) {
    console.error("Update menu availability:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update availability",
    });
  }
};
