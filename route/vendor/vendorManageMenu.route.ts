import express from "express";

import {
  getMyMenuItems,
  getMyMenuItemById,
  updateMyMenuItem,
  deleteMyMenuItem,
  updateMenuAvailability,
} from "../../controllers/vendor/vendorManageMenu.controller.ts";

import { attachSession } from "../../middleware/auth.middleware.ts";

const router = express.Router();

// Authenticate all vendor requests
router.use(attachSession);

// GET: All vendor menu items
router.get("/my-items", getMyMenuItems);

// GET: Single menu item
router.get("/my-items/:id", getMyMenuItemById);

// PATCH: Update menu item
router.patch("/my-items/:id", updateMyMenuItem);

// DELETE: Delete menu item
router.delete("/my-items/:id", deleteMyMenuItem);

// PATCH: Manage availability
router.patch(
  "/my-items/:id/availability",
  updateMenuAvailability
);

export default router;