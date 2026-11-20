import express from "express";
import { getAllMenu } from "../controllers/browseMenu.controller.ts";
const router = express.Router();


router.get("/all", getAllMenu);

export default router;