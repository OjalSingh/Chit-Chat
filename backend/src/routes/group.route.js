import express from "express";
import {
    createGroup,
    getMyGroups,
    getGroup,
    getGroupMessages,
    sendGroupMessage,
    addMembers,
    removeMember,
    renameGroup,
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { validateObjectId } from "../middleware/validateObjectId.middleware.js";
import { listPlans, createPlan, detectNow } from "../controllers/plan.controller.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.post("/", createGroup);
router.get("/", getMyGroups);

router.param("groupId", (req, res, next) => validateObjectId("groupId")(req, res, next));
router.param("userId", (req, res, next) => validateObjectId("userId")(req, res, next));

router.get("/:groupId", getGroup);
router.patch("/:groupId", renameGroup);
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", sendGroupMessage);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/members/:userId", removeMember);

router.get("/:groupId/plans", listPlans);
router.post("/:groupId/plans", createPlan);
router.post("/:groupId/plans/detect", detectNow);

export default router;
