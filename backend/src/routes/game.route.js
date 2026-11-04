import express from "express";
import { listGames, today, guess, myStats, leaderboard } from "../controllers/game.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.get("/", listGames);
router.get("/wordle/today", today);
router.post("/wordle/guess", guess);
router.get("/wordle/stats", myStats);
router.get("/wordle/leaderboard/:groupId", leaderboard);

export default router;
