import express from "express";

import {
  getAllUsers,
  getUserById,
  getUserStats,
} from "../../controllers/admin/adminManageUser.controller.ts";



const router = express.Router();

// All routes require admin


// Get users
router.get("/", getAllUsers);

// Get statistics
router.get("/stats", getUserStats);

// Get single user
router.get("/:id", getUserById);

export default router;