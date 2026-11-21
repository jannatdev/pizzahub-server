import { Router } from "express";

import {
  createOrder,
   getMyOrders,
  getOrderById,
} from "../controllers/order.controller.ts";

import { requireAuth } from "../middleware/auth.middleware.ts";

const router = Router();

router.post(
  "/",
  requireAuth,
  createOrder
);
router.get(
  "/",
  requireAuth,
  getMyOrders
);

// Get one order
router.get(
  "/:id",
  requireAuth,
  getOrderById
);
export default router;

// 