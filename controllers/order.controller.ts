import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { menus, orders } from "../config/db.config.ts";
import type { AuthedRequest } from "../middleware/auth.middleware.ts";

// ============================================================
// CREATE ORDER
// POST /orders
// ============================================================
export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in to place an order.",
      });
      return;
    }

    const {
      menuId,
      quantity = 1,
      deliveryDate,
      deliveryAddress,
      additionalMessage,
    } = req.body;

    // Validate menu ID
    if (
      !menuId ||
      typeof menuId !== "string" ||
      !ObjectId.isValid(menuId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid menu item ID.",
      });
      return;
    }

    // Validate delivery address
    if (
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Delivery address is required.",
      });
      return;
    }

    // Validate delivery date
    if (!deliveryDate) {
      res.status(400).json({
        success: false,
        message: "A delivery date is required.",
      });
      return;
    }

    const parsedDeliveryDate = new Date(deliveryDate);

    if (Number.isNaN(parsedDeliveryDate.getTime())) {
      res.status(400).json({
        success: false,
        message: "A valid delivery date is required.",
      });
      return;
    }

    // Normalize delivery date to UTC midnight
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
      res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer.",
      });
      return;
    }

    // Find menu item
    const menuItem = await menus.findOne({
      _id: new ObjectId(menuId),
    });

    if (!menuItem) {
      res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
      return;
    }

    // Only approved menu items can be ordered
    if (menuItem.status !== "Approved") {
      res.status(403).json({
        success: false,
        message: "This menu item is not approved for ordering.",
      });
      return;
    }

    // Only active menu items can be ordered
    if (menuItem.isActive !== true) {
      res.status(403).json({
        success: false,
        message: "This menu item is currently inactive.",
      });
      return;
    }

    // Prevent vendor from ordering their own menu item
    const vendorId =
      menuItem.vendorId?.toString?.() ??
      menuItem.createdById?.toString?.();

    if (
      vendorId &&
      vendorId === user.id?.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "You cannot order your own menu item.",
      });
      return;
    }

    // IMPORTANT:
    // Always get price from MongoDB.
    // Never trust price sent by frontend.
    const price = Number(menuItem.price);

    if (!Number.isFinite(price) || price < 0) {
      res.status(500).json({
        success: false,
        message: "Invalid menu item price.",
      });
      return;
    }

    const totalPrice = price * quantity;

    // Prevent duplicate active order
    const duplicate = await orders.findOne({
      customerId: user.id,
      menuId: menuItem._id,
      deliveryDate: deliveryDateDay,
      status: {
        $in: ["Pending", "Accepted"],
      },
    });

    if (duplicate) {
      res.status(409).json({
        success: false,
        message:
          "You already have an active order for this item on that delivery date.",
      });
      return;
    }

    // Create order
    const order = {
      menuId: menuItem._id,

      customerId: user.id,
      customerName: user.name || "",
      customerEmail: user.email,

      vendorId:
        menuItem.vendorId ||
        menuItem.createdById,

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

    res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: {
        _id: result.insertedId,
        ...order,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to place order.",
    });
  }
};

// ============================================================
// GET MY ORDERS
// GET /orders/my-orders
// ============================================================
export const getMyOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
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

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully.",
      data: userOrders,
    });
  } catch (error) {
    console.error("Get my orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
};

// ============================================================
// GET SINGLE ORDER
// GET /orders/:id
// ============================================================
export const getOrderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
    }

    const { id } = req.params;

    if (
      typeof id !== "string" ||
      !ObjectId.isValid(id)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
      return;
    }

    const order = await orders.findOne({
      _id: new ObjectId(id),
      customerId: user.id,
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Order fetched successfully.",
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch order.",
    });
  }
};

// ============================================================
// CANCEL ORDER
// PATCH /orders/:id/cancel
// ============================================================
export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as AuthedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "You must be logged in.",
      });
      return;
    }

    const { id } = req.params;

    if (
      typeof id !== "string" ||
      !ObjectId.isValid(id)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
      return;
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
        res.status(404).json({
          success: false,
          message: "Order not found.",
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: `You cannot cancel an order with ${existingOrder.status} status.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel order.",
    });
  }
};