
import { Router } from "express";

import {
  getAllUsers,
  getUserById,
  getUserStats,
} from "../../controllers/admin/adminManageUser.controller.ts";

import {
  authenticate,
  authorizeRoles,
} from "../../middleware/auth.middleware.ts";

const router = Router();

// All routes below require an authenticated admin
router.use(authenticate, authorizeRoles("admin"));

router.get("/users", getAllUsers);
router.get("/users/stats", getUserStats);
router.get("/users/:id", getUserById);

export default router;
