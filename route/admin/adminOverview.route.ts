
import { Router } from "express";

import { getAdminOverview } from "../../controllers/admin/adminOverview.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

router.use(authenticate, authorizeRoles("admin"));

router.get("/overview", getAdminOverview);

export default router;

