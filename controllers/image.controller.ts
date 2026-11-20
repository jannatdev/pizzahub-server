import type { Request, Response } from "express";
import { uploadToImgBB } from "../services/imgbb.service.ts";

export const uploadProfileImage = async (
  req: Request,
  res: Response
) => {
    
  try {
    // Check whether an image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a profile image",
      });
    }

    // Upload image to ImgBB
    const { url: imageUrl } = await uploadToImgBB(req.file);

    // Send image URL to frontend
    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("Profile image upload error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Image upload failed",
    });
  }
};

export const uploadMenuImage = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Menu image is required.",
      });
    }

    // Same ImgBB service the profile upload uses — no duplicated logic.
    const { url, displayUrl } = await uploadToImgBB(req.file);

    return res.status(201).json({
      success: true,
      message: "Menu image uploaded successfully.",
      imageUrl: url,
      displayUrl,
    });
  } catch (error) {
    console.error("Menu image upload error:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Menu image upload failed.",
    });
  }
};
