import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from "../controllers/order.controller.ts";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.ts";

const router = Router();

// All order routes require customer authentication
router.use(
  authenticate,
  authorizeRoles("customer")
);

router.post("/", createOrder);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById);
router.patch("/:id/cancel", cancelOrder);

export default router;
// 