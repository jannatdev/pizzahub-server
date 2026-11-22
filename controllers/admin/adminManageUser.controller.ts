
import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { db } from "../../config/db.config.ts";

const users = db.collection("user");

// Get all users
export const getAllUsers = async (
  req: Request,
  res: Response
) => {
  try {
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "all");

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const filter: Record<string, any> = {};

    if (search) {
      const safeSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (role !== "all") {
      if (!["customer", "vendor", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      filter.role = role;
    }

    const totalUsers = await users.countDocuments(filter);

    const userList = await users
      .find(filter)
      .project({
        name: 1,
        email: 1,
        image: 1,
        role: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const formattedUsers = userList.map((user) => ({
      id: String(user._id),
      name: user.name || "Unknown",
      email: user.email,
      image: user.image || null,
      role: user.role || "customer",
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// Get single user
export const getUserById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await users.findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          createdAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: String(user._id),
        name: user.name || "Unknown",
        email: user.email,
        image: user.image || null,
        role: user.role || "customer",
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

// User statistics
export const getUserStats = async (
  req: Request,
  res: Response
) => {
  try {
    const [
      totalUsers,
      customers,
      vendors,
      admins,
    ] = await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ role: "customer" }),
      users.countDocuments({ role: "vendor" }),
      users.countDocuments({ role: "admin" }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        customers,
        vendors,
        admins,
      },
    });
  } catch (error) {
    console.error("User stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
    });
  }
};
