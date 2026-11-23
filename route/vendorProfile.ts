import { Router } from "express";
import { getCustomerProfile } from "../controllers/customerProfile.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

const router = Router();

router.get("/profile", authMiddleware, getCustomerProfile);

export default router;