
import express from "express";

import {
  getVendorOrders,
  updateVendorOrderStatus,
} from "../../controllers/vendor/vendorManageOrder.controller.ts";

import { requireAuth } from "../../middleware/auth.middleware.ts";

const router = express.Router();

// Vendor: Get all received orders
router.get("/vendor", requireAuth, getVendorOrders);

// Vendor: Accept or Reject an order
router.patch("/:id/status", requireAuth, updateVendorOrderStatus);

// IMPORTANT: Default export
export default router;
