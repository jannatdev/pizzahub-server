
import { Router } from "express";

import {
  getVendorOverview,
} from "../../controllers/vendor/vendorOverview.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

// Vendor-only access
router.use(authenticate, authorizeRoles("vendor"));

router.get("/overview", getVendorOverview);

export default router;

