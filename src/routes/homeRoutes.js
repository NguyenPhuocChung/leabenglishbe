import { Router } from "express";
import { getHomeData } from "../controllers/homeController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.get("/", asyncHandler(getHomeData));

export default router;