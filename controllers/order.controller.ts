import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { menus, orders } from "../config/db.config.ts";
import type { AuthedRequest } from "../middleware/auth.middleware.ts";



export const createOrder = async (
  req: Request,
  res: Response
) => {
  try {
    // User is attached by the auth middleware (requireAuth)
    const user = (req as AuthedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to place an order.",
      });
    }

    // Only customers can place orders
    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can place orders.",
      });
    }

    const {
      menuId,
      quantity = 1,
      deliveryDate,
      deliveryAddress,
      additionalMessage,
    } = req.body;

    // Validate menuId (invalid/missing ids must be a 400, not a 500 from the
    // ObjectId constructor blowing up below).
    if (!menuId || typeof menuId !== "string" || !ObjectId.isValid(menuId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID.",
      });
    }

    // Validate delivery date + address (required by the order form)
    if (typeof deliveryAddress !== "string" || !deliveryAddress.trim()) {
      return res.status(400).json({
        success: false,
        message: "Delivery date and address are required.",
      });
    }

    const parsedDeliveryDate = new Date(deliveryDate);

    if (!deliveryDate || Number.isNaN(parsedDeliveryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "A valid delivery date is required.",
      });
    }

    // Normalize to UTC midnight of the calendar day so duplicate checks and
    // stored values compare deterministically.
    const deliveryDateDay = new Date(
      Date.UTC(
        parsedDeliveryDate.getUTCFullYear(),
        parsedDeliveryDate.getUTCMonth(),
        parsedDeliveryDate.getUTCDate()
      )
    );

    // Validate quantity
    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer.",
      });
    }

    // Find menu item
    const menuItem = await menus.findOne({
      _id: new ObjectId(menuId),
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    // Only approved items can be ordered
    if (menuItem.status !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "This menu item is not approved for ordering.",
      });
    }

    // Only active items can be ordered
    if (menuItem.isActive !== true) {
      return res.status(403).json({
        success: false,
        message: "This menu item is currently inactive.",
      });
    }

    // Prevent vendor from ordering their own item
    const vendorId =
      menuItem.vendorId?.toString?.() ??
      menuItem.createdById?.toString?.();

    if (
      vendorId &&
      vendorId === user.id?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot order your own menu item.",
      });
    }

    // IMPORTANT:
    // Get price from database instead of trusting frontend
    const price = Number(menuItem.price);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(500).json({
        success: false,
        message: "Invalid menu item price.",
      });
    }

    const totalPrice = price * quantity;

    // Phase 16: one active order per customer per item per delivery date.
    const duplicate = await orders.findOne({
      customerId: user.id,
      menuId: menuItem._id,
      deliveryDate: deliveryDateDay,
      status: { $in: ["Pending", "Accepted"] },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an active order for this item on that delivery date.",
      });
    }

  const order = {
  menuId: menuItem._id,

  customerId: user.id,
  customerName: user.name || "",
  customerEmail: user.email,

  vendorId: menuItem.vendorId || menuItem.createdById,
  vendorName:
    menuItem.vendorName ||
    menuItem.createdByName ||
    "",
  vendorEmail:
    menuItem.vendorEmail ||
    menuItem.createdByEmail ||
    "",

  itemName: menuItem.itemName,
  itemImage: menuItem.images?.[0] || "",

  price,
  quantity,
  totalPrice,

  deliveryDate: deliveryDateDay,
  deliveryAddress: deliveryAddress.trim(),
  additionalMessage:
    typeof additionalMessage === "string"
      ? additionalMessage.trim().slice(0, 500)
      : "",

  status: "Pending",

  createdAt: new Date(),
  updatedAt: new Date(),
};

    const result = await orders.insertOne(order);

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: {
        _id: result.insertedId,
        ...order,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to place order.",
    });
  }
};

// get order
export const getMyOrders = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as AuthedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    // Only customers can access customer orders
    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can access their orders.",
      });
    }

    const customerId = user.id;

    const userOrders = await orders
      .find({
        customerId,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully.",
      data: userOrders,
    });
  } catch (error) {
    console.error("Get my orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
};
// signle order
export const getOrderById = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as AuthedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can access customer orders.",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await orders.findOne({
      _id: new ObjectId(id),
      customerId: user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully.",
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order.",
    });
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as AuthedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can cancel orders.",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const result = await orders.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        customerId: user.id,
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!result) {
      const existingOrder = await orders.findOne({
        _id: new ObjectId(id),
        customerId: user.id,
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      return res.status(400).json({
        success: false,
        message: `You cannot cancel an order with ${existingOrder.status} status.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel order.",
    });
  }
};