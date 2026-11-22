// Menu-item routes. This file only wires paths → controller functions;
import express from "express";

import {
  createMenuItem,
  getVendorMenuCount,
  getVendorPremium,
} from "../controllers/menu.controller.ts";

import {  authenticate, authorizeRoles } from "../middleware/auth.middleware.ts";

const router = express.Router();

router.get(
  "/vendor/count",
  authenticate,
    authorizeRoles("vendor", "admin"),
  getVendorMenuCount
);

router.post("/:email", authenticate,
  authorizeRoles("vendor", "admin"), createMenuItem);
router.get(
  "/vendor/premium-status",
  authenticate,
  authorizeRoles("vendor", "admin"),
  getVendorPremium
);

export default router;
