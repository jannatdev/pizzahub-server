import type { Request, Response } from "express";

import {
  users,
  menus,
  payments,
} from "../../config/db.config.ts";

export const getAdminOverview = async (
  req: Request,
  res: Response
) => {
  try {
    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalMenuItems,
      pendingMenuItems,
      totalTransactions,
    ] = await Promise.all([
      users.countDocuments(),

      users.countDocuments({
        role: "vendor",
      }),

      users.countDocuments({
        role: "customer",
      }),

      menus.countDocuments(),

      menus.countDocuments({
        status: "Pending",
      }),

      payments.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalMenuItems,
        pendingMenuItems,
        totalTransactions,
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};