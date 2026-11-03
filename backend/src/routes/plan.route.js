import express from "express";
import { rsvp, vote, updatePlan } from "../controllers/plan.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);
router.param("planId", (req, res, next) => validateObjectId("planId")(req, res, next));

router.post("/:planId/rsvp", rsvp);
router.post("/:planId/vote", vote);
router.patch("/:planId", updatePlan);

export default router;
