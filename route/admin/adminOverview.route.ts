import express from "express";

import {
  getAdminOverview,
} from "../../controllers/admin/adminOverview.controller.ts";

const router = express.Router();

router.get("/stats", getAdminOverview);

export default router;