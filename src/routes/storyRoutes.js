import { Router } from "express";
import {
  createStory,
  completeStory,
  deleteStory,
  getStory,
  getStoryBySlug,
  listStories,
  updateStory,
} from "../controllers/storiesController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { optionalAuthenticate } from "../middleware/authenticate.js";

const router = Router();
router.get("/", optionalAuthenticate, asyncHandler(listStories));
router.get("/slug/:slug", optionalAuthenticate, asyncHandler(getStoryBySlug));
router.post("/", authenticate, requireAdmin, asyncHandler(createStory));
router.post("/:storyId/complete", authenticate, asyncHandler(completeStory));
router.get("/:id", optionalAuthenticate, asyncHandler(getStory));
router.patch("/:id", authenticate, requireAdmin, asyncHandler(updateStory));
router.delete("/:id", authenticate, requireAdmin, asyncHandler(deleteStory));

export default router;