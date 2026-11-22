
import { Router } from "express";

import {
  getVendorOrders,
  updateVendorOrderStatus,
} from "../../controllers/vendor/vendorManageOrder.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

// All routes require an authenticated vendor
router.use(authenticate, authorizeRoles("vendor"));

// Get vendor orders
router.get("/orders", getVendorOrders);

// Update order status
router.patch("/orders/:id/status", updateVendorOrderStatus);

export default router;

