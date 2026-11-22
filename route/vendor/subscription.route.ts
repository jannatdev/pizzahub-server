
import { Router } from "express";

import {
  getVendorSubscription,
} from "../../controllers/vendor/subscription.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

// Vendor-only access
router.use(authenticate, authorizeRoles("vendor"));

router.get("/subscription", getVendorSubscription);

export default router;
