
import type { Request, Response } from "express";

import {
  users,
  menus,
  transactions,
} from "../../config/db.config.ts";

export const getAdminOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
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
      users.countDocuments({ role: "vendor" }),
      users.countDocuments({ role: "customer" }),
      menus.countDocuments(),
      menus.countDocuments({ status: "Pending" }),
      transactions.countDocuments(),
    ]);

    res.status(200).json({
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

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

