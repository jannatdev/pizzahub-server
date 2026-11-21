

import type { Request, Response } from "express";
import { ObjectId } from "mongodb";

import { menus, users } from "../../config/db.config.ts";

// Helper: Get authenticated vendor
const getVendor = async (req: Request) => {
  const authUser = req.user;

  if (!authUser?.email) {
    return null;
  }

  if (authUser.role !== "vendor") {
    return null;
  }

  const vendor = await users.findOne({
    email: authUser.email,
  });

  return vendor;
};

// GET: Get all menu items belonging to logged-in vendor
export const getMyMenuItems = async (
  req: Request,
  res: Response
) => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access this resource",
      });
    }

    // Optional status filter
    const status = String(req.query.status || "all");

    const filter: Record<string, any> = {
      vendorId: vendor._id,
    };

    if (
      ["Pending", "Approved", "Rejected"].includes(status)
    ) {
      filter.status = status;
    } else if (status !== "all") {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter",
      });
    }

    const items = await menus
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Vendor menu items fetched successfully",
      total: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Get vendor menu items:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menu items",
    });
  }
};

// GET: Get single menu item details
export const getMyMenuItemById = async (
  req: Request,
  res: Response
) => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access this resource",
      });
    }

   const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    const item = await menus.findOne({
      _id: new ObjectId(id),
      vendorId: vendor._id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu item details fetched successfully",
      data: item,
    });
  } catch (error) {
    console.error("Get vendor menu details:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menu details",
    });
  }
};

// PATCH: Update vendor menu item
export const updateMyMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access this resource",
      });
    }

    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    // Verify item ownership
    const existingItem = await menus.findOne({
      _id: new ObjectId(id),
      vendorId: vendor._id,
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
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
      if (
        typeof itemName !== "string" ||
        !itemName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Item name is required",
        });
      }

      updateData.itemName = itemName.trim();
    }

    if (category !== undefined) {
      if (
        typeof category !== "string" ||
        !category.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Category is required",
        });
      }

      updateData.category = category.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Description is required",
        });
      }

      updateData.description = description.trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be greater than zero",
        });
      }

      updateData.price = numericPrice;
    }

    if (location !== undefined) {
      if (
        typeof location !== "string" ||
        !location.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Location is required",
        });
      }

      updateData.location = location.trim();
    }

    if (imageUrl !== undefined) {
      if (
        typeof imageUrl !== "string" ||
        !imageUrl.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Image URL is required",
        });
      }

      updateData.imageUrl = imageUrl.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid update fields provided",
      });
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

    return res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
    });
  } catch (error) {
    console.error("Update vendor menu item:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update menu item",
    });
  }
};

// DELETE: Delete vendor menu item
export const deleteMyMenuItem = async (
  req: Request,
  res: Response
) => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access this resource",
      });
    }

   const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    const result = await menus.deleteOne({
      _id: new ObjectId(id),
      vendorId: vendor._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Delete vendor menu item:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete menu item",
    });
  }
};

// PATCH: Update menu item availability
export const updateMenuAvailability = async (
  req: Request,
  res: Response
) => {
  try {
    const vendor = await getVendor(req);

    if (!vendor) {
      return res.status(403).json({
        success: false,
        message: "Only vendors can access this resource",
      });
    }

    const id = String(req.params.id);
    const { isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
    }

    // Availability can only be managed for approved items
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
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Only approved items can manage availability",
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Menu item is now available"
        : "Menu item is now unavailable",
      isActive,
    });
  } catch (error) {
    console.error("Update menu availability:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update availability",
    });
  }
};
