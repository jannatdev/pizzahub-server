// Image routes — path wiring only; the handlers live in
// controllers/image.controller.ts and ImgBB calls in services/imgbb.service.ts.
import { Router } from "express";

import { upload } from "../middleware/upload.middleware.ts";
import {
  uploadProfileImage,
  uploadMenuImage,
} from "../controllers/image.controller.ts";

const router = Router();

// POST /images/profile — profile picture (sign-up form)
router.post(
  "/profile",
  upload.single("profileImage"),
  uploadProfileImage
);

// POST /images/menu — menu item picture (Add Menu form)
router.post(
  "/menu",
  upload.single("menuImage"),
  uploadMenuImage
);

export default router;
