import mongoose from "mongoose";
import Group from "../models/Group.js";
import GameResult from "../models/GameResult.js";
import FlapScore, { FLAP_MAX_SCORE } from "../models/FlapScore.js";
import { io, groupRoom } from "../lib/socket.js";
import { CATALOG } from "../games/catalog.js";
import {
    MAX_GUESSES,
    answerFor,
    computeStats,
    dayKeyFor,
    evaluate,
    isValidGuess,
} from "../games/wordle.js";

export const GAMES = [
    {
        key: "wordle",
        name: "Word of the day",
        blurb: "Guess the five-letter word in six tries. Same word for everyone, every day.",
    },
    {
        key: "flap",
        name: "Tap to flap",
        blurb: "Tap to flap through the pipes. Beat your crew's best.",
    },
];

const handle = (name, fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        console.log(`Error in ${name}:`, error);
        res.status(500).json({ message: "Server error" });
    }
};

/* What the player is allowed to see about their own game. */
const viewOf = (result, dayKey) => {
    const done = result?.status === "won" || result?.status === "lost";
    return {
        dayKey,
        status: result?.status ?? "new",
        maxGuesses: MAX_GUESSES,
        guesses: (result?.guesses ?? []).map((g) => ({ word: g.word, marks: g.marks })),
        attempts: result?.attempts ?? 0,
        // The answer is revealed only after a lost game.
        answer: result?.status === "lost" ? answerFor(dayKey) : undefined,
        finished: done,
    };
};

/* GET /api/games/catalog: link games a plan can point at */
export const catalog = (_req, res) => res.status(200).json(CATALOG);

/* GET /api/games */
export const listGames = (_req, res) => res.status(200).json(GAMES);

/* GET /api/games/wordle/today */
export const today = handle("wordleToday", async (req, res) => {
    const dayKey = dayKeyFor();
    const result = await GameResult.findOne({ userId: req.user._id, game: "wordle", dayKey });
    res.status(200).json(viewOf(result, dayKey));
});

/*
 * POST /api/games/wordle/guess
 * Body: { guess }. The server scores the guess; the client never sees the
 * answer unless the game is lost. Updates are conditional on the game
 * still being open, so double clicks or two tabs can't add a seventh guess
 * or the same word twice.
 */
export const guess = handle("wordleGuess", async (req, res) => {
    const word = typeof req.body.guess === "string" ? req.body.guess.trim().toLowerCase() : "";
    if (!isValidGuess(word)) {
        return res.status(400).json({ message: "Not in the word list" });
    }

    const dayKey = dayKeyFor();
    const filter = { userId: req.user._id, game: "wordle", dayKey };
    try {
        await GameResult.updateOne(filter, { $setOnInsert: { guesses: [], status: "playing" } }, { upsert: true });
    } catch (error) {
        if (error.code !== 11000) throw error; // two first guesses raced; the row exists now
    }

    const marks = evaluate(word, answerFor(dayKey));
    const updated = await GameResult.findOneAndUpdate(
        {
            ...filter,
            status: "playing",
            [`guesses.${MAX_GUESSES - 1}`]: { $exists: false },
            "guesses.word": { $ne: word },
        },
        { $push: { guesses: { word, marks } } },
        { new: true }
    );

    if (!updated) {
        const existing = await GameResult.findOne(filter);
        if (existing.status !== "playing") return res.status(400).json({ message: "You already finished today's word" });
        return res.status(400).json({ message: "You already tried that word" });
    }

    let result = updated;
    const solved = marks === "ggggg";
    const outOfTries = updated.guesses.length >= MAX_GUESSES;
    if (solved || outOfTries) {
        result = await GameResult.findOneAndUpdate(
            { _id: updated._id, status: "playing" },
            { $set: { status: solved ? "won" : "lost", attempts: updated.guesses.length, finishedAt: new Date() } },
            { new: true }
        );
        await announceFinish(req.user, result);
    }

    res.status(200).json(viewOf(result, dayKey));
});

/* Tells the player's groups they finished (marks only, no words). */
async function announceFinish(user, result) {
    const groups = await Group.find({ members: user._id }).select("_id");
    for (const group of groups) {
        io.to(groupRoom(group._id)).emit("game:result", {
            groupId: group._id,
            userId: user._id,
            username: user.username,
            game: "wordle",
            dayKey: result.dayKey,
            status: result.status,
            attempts: result.attempts,
        });
    }
}

/* GET /api/games/wordle/stats  (my own record) */
export const myStats = handle("wordleStats", async (req, res) => {
    const results = await GameResult.find({ userId: req.user._id, game: "wordle" });
    res.status(200).json(computeStats(results));
});

/*
 * GET /api/games/wordle/leaderboard/:groupId
 * Everyone in the group, ranked. Today's coloured grids are shown only to
 * people who have finished today, so looking at the board can't spoil
 * the word.
 */
export const leaderboard = handle("wordleLeaderboard", async (req, res) => {
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid groupId" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.hasMember(req.user._id)) {
        return res.status(403).json({ message: "You are not a member of this group" });
    }

    await group.populate("members", "username");
    const memberIds = group.members.map((m) => m._id);
    const results = await GameResult.find({ userId: { $in: memberIds }, game: "wordle" });
    const dayKey = dayKeyFor();

    const byUser = new Map(memberIds.map((id) => [id.toString(), []]));
    for (const r of results) byUser.get(r.userId.toString())?.push(r);

    const mine = byUser.get(req.user._id.toString()) ?? [];
    const iFinishedToday = mine.some((r) => r.dayKey === dayKey && r.status !== "playing");

    const rows = group.members.map((member) => {
        const theirs = byUser.get(member._id.toString()) ?? [];
        const todays = theirs.find((r) => r.dayKey === dayKey);
        const todayStatus = todays?.status ?? "new";
        const finished = todayStatus === "won" || todayStatus === "lost";
        return {
            userId: member._id,
            username: member.username,
            stats: computeStats(theirs, dayKey),
            today: {
                status: todayStatus,
                guessesUsed: todays?.guesses.length ?? 0,
                attempts: finished ? todays.attempts : null,
                // Grid of marks only, and only once the viewer has finished too.
                grid: finished && iFinishedToday ? todays.guesses.map((g) => g.marks) : null,
            },
        };
    });

    // Rank: best average first among people with wins; ties by more wins, then name.
    rows.sort((a, b) => {
        const av = a.stats.averageGuesses ?? Infinity;
        const bv = b.stats.averageGuesses ?? Infinity;
        return av - bv || b.stats.won - a.stats.won || a.username.localeCompare(b.username);
    });

    res.status(200).json({ dayKey, iFinishedToday, rows });
});

/*
 * POST /api/games/flap/score
 * Body: { score }   A whole number from 0 to 500. Keeps the player's best.
 */
export const flapScore = handle("flapScore", async (req, res) => {
    const { score } = req.body;
    if (!Number.isInteger(score) || score < 0 || score > FLAP_MAX_SCORE) {
        return res.status(400).json({ message: `score must be a whole number from 0 to ${FLAP_MAX_SCORE}` });
    }
    const before = await FlapScore.findOneAndUpdate(
        { userId: req.user._id },
        { $max: { best: score }, $inc: { plays: 1 }, $set: { lastPlayedAt: new Date() } },
        { upsert: true, new: false }
    );
    const best = Math.max(before?.best ?? 0, score);
    res.status(200).json({ best, plays: (before?.plays ?? 0) + 1, newBest: score > (before?.best ?? 0) });
});

/*
 * GET /api/games/flap/leaderboard/:groupId
 * Everyone in the group by best score. Players who haven't played show 0.
 */
export const flapLeaderboard = handle("flapLeaderboard", async (req, res) => {
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) return res.status(400).json({ message: "Invalid groupId" });
    const group = await Group.findById(groupId).populate("members", "username");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.hasMember(req.user._id)) {
        return res.status(403).json({ message: "You are not a member of this group" });
    }
    const scores = await FlapScore.find({ userId: { $in: group.members.map((m) => m._id) } });
    const byUser = new Map(scores.map((s) => [s.userId.toString(), s]));
    const rows = group.members
        .map((m) => ({
            userId: m._id,
            username: m.username,
            best: byUser.get(m._id.toString())?.best ?? 0,
            plays: byUser.get(m._id.toString())?.plays ?? 0,
        }))
        .sort((a, b) => b.best - a.best || a.username.localeCompare(b.username));
    res.status(200).json({ rows });
});
