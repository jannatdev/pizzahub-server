
import { Router } from "express";



import {
    getCustomerProfile,
  updateCustomerProfile,
} from "../controllers/customerProfile.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.ts";

const router = Router();

// Get customer profile
router.get(
  "/profile",
  authenticate,
  authorizeRoles("customer"),
  getCustomerProfile
);

// Update customer profile
router.patch(
  "/profile",
  authenticate,
  authorizeRoles("customer"),
  updateCustomerProfile
);

export default router;
