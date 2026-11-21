import { Router } from "express";

import {
  getMenuDetails,
} from "../controllers/singleMenu.controller.ts";

const router = Router();

router.get("/:id", getMenuDetails);

export default router;