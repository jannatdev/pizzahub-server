import { Router } from "express";

import {
  getAllMenuItems,
  approveMenuItem,
  rejectMenuItem,
  deleteMenuItem,
} from "../../controllers/admin/adminMenuManage.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

// All routes below require an authenticated admin
router.use(authenticate, authorizeRoles("admin"));

// Get all submitted menus
router.get("/menus", getAllMenuItems);

// Approve menu
router.patch("/menus/:id/approve", approveMenuItem);

// Reject menu
router.patch("/menus/:id/reject", rejectMenuItem);

// Delete menu
router.delete("/menus/:id", deleteMenuItem);

export default router;