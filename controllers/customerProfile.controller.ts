
import type { Request, Response } from "express";
import { users } from "../config/db.config.ts";
import type { AuthedRequest } from "../middleware/auth.middleware.ts";


// GET customer profile
export const getCustomerProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authUser = (req as AuthedRequest).user;

    if (!authUser?.email) {
      res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
      return;
    }

    const customer = await users.findOne(
      {
        email: authUser.email,
        role: "customer",
      },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          createdAt: 1,
        },
      }
    );

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer profile not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer profile fetched successfully.",
      data: customer,
    });
  } catch (error) {
    console.error("Get customer profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer profile.",
    });
  }
};

export const updateCustomerProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authUser = (req as AuthedRequest).user;

    if (!authUser?.email) {
      res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
      return;
    }

    const { name, image } = req.body as {
      name?: string;
      image?: string;
    };

    // Validate name
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Name is required.",
      });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: "Name cannot exceed 100 characters.",
      });
      return;
    }

    // Validate image URL when provided
    if (image !== undefined && image !== "") {
      try {
        const parsedImageUrl = new URL(image);

        if (!["http:", "https:"].includes(parsedImageUrl.protocol)) {
          throw new Error("Invalid image protocol");
        }
      } catch {
        res.status(400).json({
          success: false,
          message: "Please provide a valid profile image URL.",
        });
        return;
      }
    }

    const updateData: {
      name: string;
      updatedAt: Date;
      image?: string;
    } = {
      name: name.trim(),
      updatedAt: new Date(),
    };

    if (image !== undefined) {
      updateData.image = image;
    }

    const result = await users.updateOne(
      {
        email: authUser.email,
        role: "customer",
      },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Customer profile not found.",
      });
      return;
    }

    const updatedUser = await users.findOne(
      { email: authUser.email },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          createdAt: 1,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Customer profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update customer profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update customer profile.",
    });
  }
};
