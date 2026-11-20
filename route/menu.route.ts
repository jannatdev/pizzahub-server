// Menu-item routes. This file only wires paths → controller functions;
import express from "express";

import {
  createMenuItem,
  getVendorMenuCount,
  getVendorPremium,
} from "../controllers/menu.controller.ts";

import { attachSession } from "../middleware/auth.middleware.ts";

const router = express.Router();

router.get(
  "/vendor/count",
  attachSession,
  getVendorMenuCount
);

router.post("/:email", attachSession, createMenuItem);
router.get(
  "/vendor/premium-status",
  attachSession,
  getVendorPremium
);

export default router;
