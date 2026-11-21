import { Router } from "express";

import {
  getVendorSubscription,
} from "../../controllers/vendor/subscription.controller.ts";

import {  requireAuth } from "../../middleware/auth.middleware.ts";

const router = Router();

router.get(
  "/subscription",
  requireAuth,
  getVendorSubscription
);

export default router;