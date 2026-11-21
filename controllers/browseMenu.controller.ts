
import type { Request, Response } from "express";
import { menus, users } from "../config/db.config.ts";

// Public browse query — only admin-approved, active menu items are visible.
const BASE_FILTER: Record<string, unknown> = {
  status: "Approved",
  // The admin approve action sets isActive: true; treat a missing flag as
  // active (older approved docs) but hide anything explicitly deactivated.
  isActive: { $ne: false },
};

// Escape user input so it is matched literally inside $regex.
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Keep only non-empty strings, sorted alphabetically, for filter facets.
const cleanFacet = (values: unknown): string[] => {
  if (!Array.isArray(values)) return [];
  return values
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim() !== ""
    )
    .sort((a, b) => a.localeCompare(b));
};

export const getAllMenu = async (
  req: Request,
  res: Response
) => {
  try {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "all");
    const location = String(req.query.location || "all");
    const sort = String(req.query.sort || "newest");

    // price_asc / price_desc → price sorting; anything else → newest first.
    const sortSpec: Record<string, 1 | -1> =
      sort === "price_asc"
        ? { price: 1, createdAt: -1 }
        : sort === "price_desc"
          ? { price: -1, createdAt: -1 }
          : { createdAt: -1 };

    const filter: Record<string, any> = { ...BASE_FILTER };

    // Menu documents store the item name as `itemName`.
    if (search) {
      filter.itemName = {
        $regex: escapeRegex(search),
        $options: "i",
      };
    }

    if (category !== "all") {
      filter.category = category;
    }

    if (location !== "all") {
      filter.location = {
        $regex: escapeRegex(location),
        $options: "i",
      };
    }

    // Facets are computed from BASE_FILTER (ignoring the active query) so the
    // category/location dropdowns never collapse while a filter is applied.
    const [allMenus, categories, locations] = await Promise.all([
      menus.find(filter).sort(sortSpec).toArray(),
      menus.distinct("category", BASE_FILTER),
      menus.distinct("location", BASE_FILTER),
    ]);

    // Join the owning vendor's profile image so cards can render a real
    // avatar (menu documents only store vendorName/vendorEmail/vendorId).
    const vendorIds = [
      ...new Set(
        allMenus
          .map((menu) => menu.vendorId)
          .filter((id): id is NonNullable<typeof id> => Boolean(id))
      ),
    ];

    const vendorImages = new Map<string, string>();

    if (vendorIds.length > 0) {
      const vendors = await users
        .find({ _id: { $in: vendorIds } })
        .project({ image: 1 })
        .toArray();

      for (const vendor of vendors) {
        vendorImages.set(
          String(vendor._id),
          typeof vendor.image === "string" ? vendor.image : ""
        );
      }
    }

    const result = allMenus.map((menu) => ({
      ...menu,
      vendorImage: menu.vendorId
        ? vendorImages.get(String(menu.vendorId)) ?? ""
        : "",
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      menus: result,
      categories: cleanFacet(categories),
      locations: cleanFacet(locations),
    });
  } catch (error) {
    console.error("Browse menu error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch menus",
    });
  }
};
