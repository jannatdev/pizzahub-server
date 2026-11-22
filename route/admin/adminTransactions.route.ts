
import { Router } from "express";

import {
  getAdminTransactions,
} from "../../controllers/admin/adminTransactions.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

// Admin-only access
router.use(authenticate, authorizeRoles("admin"));

router.get("/transactions", getAdminTransactions);

export default router;
