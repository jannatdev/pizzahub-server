
import express from "express";

import {
  getAllMenuItems,
  approveMenuItem,
  rejectMenuItem,
  deleteMenuItem
} from "../controllers/adminMenuManage.controller.ts";

import { attachSession } from "../middleware/auth.middleware.ts";

const router = express.Router();

router.get("/all", attachSession, getAllMenuItems);

router.patch("/:id/approve", attachSession, approveMenuItem);

router.patch("/:id/reject", attachSession, rejectMenuItem);
router.delete("/:id/delete", attachSession, deleteMenuItem);

export default router;
