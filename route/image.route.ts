import { Router } from "express";

import { upload } from "../middleware/upload.middleware.ts";
import { uploadProfileImage } from "../controllers/image.controller.ts";

const router = Router();

router.post(
  "/profile",     
  upload.single("profileImage"),

 uploadProfileImage
);

export default router;