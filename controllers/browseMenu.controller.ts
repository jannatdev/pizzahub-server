
import type { Request, Response } from "express";
import { menus } from "../config/db.config.ts";


export const getAllMenu = async (
  req: Request,
  res: Response
) => {
  try {
    
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "all");
    const location = String(req.query.location || "all");

    const filter: Record<string, any> = {
      status: "Approved",
      isActive: true,
    };


    if (search) {
      const safeSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.name = {
        $regex: safeSearch,
        $options: "i",
      };
    }


    if (category !== "all") {
      filter.category = category;
    }


    if (location !== "all") {
      filter.location = {
        $regex: location.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        $options: "i",
      };
    }

  
    const allMenus = await menus
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: allMenus.length,
      menus: allMenus,
    });

  } catch (error) {
    console.error("Browse menu error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menus",
    });
  }
};
