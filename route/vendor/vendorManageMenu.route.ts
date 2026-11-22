
import { Router } from "express";

import {
  getMyMenuItems,
  getMyMenuItemById,
  updateMyMenuItem,
  deleteMyMenuItem,
  updateMenuAvailability,
} from "../../controllers/vendor/vendorManageMenu.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

// All routes require an authenticated vendor
router.use(authenticate, authorizeRoles("vendor"));

// Get all vendor menu items
router.get("/menus", getMyMenuItems);

// Get one vendor menu item
router.get("/menus/:id", getMyMenuItemById);

// Update menu item
router.patch("/menus/:id", updateMyMenuItem);

// Delete menu item
router.delete("/menus/:id", deleteMyMenuItem);

// Update menu availability
router.patch("/menus/:id/availability", updateMenuAvailability);

export default router;
