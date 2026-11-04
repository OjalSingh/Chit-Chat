import express from "express";
import { getScreenshot, deleteSession } from "../controllers/session.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);
router.param("sessionId", (req, res, next) => validateObjectId("sessionId")(req, res, next));

router.get("/:sessionId/screenshot", getScreenshot);
router.delete("/:sessionId", deleteSession);

export default router;
