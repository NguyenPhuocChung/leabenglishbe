import { Router } from "express";
import {
  createTopic,
  deleteTopic,
  listTopics,
  updateTopic,
} from "../controllers/topicsController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { optionalAuthenticate } from "../middleware/authenticate.js";

const router = Router();
router.get("/", optionalAuthenticate, asyncHandler(listTopics));
router.post("/", authenticate, requireAdmin, asyncHandler(createTopic));
router.patch("/:id", authenticate, requireAdmin, asyncHandler(updateTopic));
router.delete("/:id", authenticate, requireAdmin, asyncHandler(deleteTopic));

export default router;