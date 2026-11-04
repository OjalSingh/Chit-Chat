import mongoose from "mongoose";
import Group from "../models/Group.js";
import Plan from "../models/Plan.js";
import GameSession, { SCREENSHOT_MAX_CHARS, SCREENSHOT_PATTERN } from "../models/GameSession.js";
import { emitPlan } from "../services/planEvents.js";
import { io, groupRoom } from "../lib/socket.js";

const handle = (name, fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        console.log(`Error in ${name}:`, error);
        res.status(500).json({ message: "Server error" });
    }
};

const memberGroup = async (req, res) => {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return null;
    }
    if (!group.hasMember(req.user._id)) {
        res.status(403).json({ message: "You are not a member of this group" });
        return null;
    }
    return group;
};

/* The list view never carries the image itself. */
const summary = (s) => ({
    _id: s._id,
    groupId: s.groupId,
    planId: s.planId,
    gameName: s.gameName,
    playedAt: s.playedAt,
    players: s.players,
    winnerId: s.winnerId,
    note: s.note,
    hasScreenshot: Boolean(s.screenshot),
    createdBy: s.createdBy,
});

/*
 * POST /api/groups/:groupId/sessions
 * Body: { gameName, playedAt?, playerIds, winnerId?, note?, screenshot?, planId? }
 * Logs a game the group played. Everyone in `playerIds` (and the winner)
 * must be a member. Passing a planId marks that plan done.
 */
export const logSession = handle("logSession", async (req, res) => {
    const group = await memberGroup(req, res);
    if (!group) return;

    const { gameName, playedAt, playerIds, winnerId, note, screenshot, planId } = req.body;

    const name = typeof gameName === "string" ? gameName.trim().slice(0, 60) : "";
    if (!name) return res.status(400).json({ message: "Which game did you play?" });

    const players = [...new Set(Array.isArray(playerIds) ? playerIds.map(String) : [])];
    if (players.length === 0 || !players.every((id) => mongoose.isValidObjectId(id) && group.hasMember(id))) {
        return res.status(400).json({ message: "Pick who played, from this group's members" });
    }
    if (winnerId && !players.includes(String(winnerId))) {
        return res.status(400).json({ message: "The winner must be one of the players" });
    }

    let when = new Date();
    if (playedAt !== undefined && playedAt !== null && playedAt !== "") {
        when = new Date(playedAt);
        if (Number.isNaN(when.getTime()) || when.getTime() > Date.now() + 24 * 3600_000) {
            return res.status(400).json({ message: "Invalid playedAt" });
        }
    }

    if (screenshot !== undefined && screenshot !== null && screenshot !== "") {
        if (typeof screenshot !== "string" || screenshot.length > SCREENSHOT_MAX_CHARS) {
            return res.status(400).json({ message: "That screenshot is too large" });
        }
        if (!SCREENSHOT_PATTERN.test(screenshot)) {
            return res.status(400).json({ message: "The screenshot must be a PNG, JPEG or WebP image" });
        }
    }

    let plan = null;
    if (planId) {
        plan = mongoose.isValidObjectId(planId) ? await Plan.findById(planId) : null;
        if (!plan || !plan.groupId.equals(group._id)) {
            return res.status(404).json({ message: "Plan not found in this group" });
        }
    }

    const session = await GameSession.create({
        groupId: group._id,
        planId: plan?._id,
        gameName: name,
        playedAt: when,
        players,
        winnerId: winnerId || undefined,
        note: typeof note === "string" ? note.trim().slice(0, 200) : "",
        screenshot: screenshot || undefined,
        createdBy: req.user._id,
    });

    if (plan && plan.status === "open") {
        plan.status = "done";
        await plan.save();
        emitPlan(plan); // clients drop plans that are no longer open
    }

    io.to(groupRoom(group._id)).emit("session:new", summary(session));
    res.status(201).json(summary(session));
});

/*
 * GET /api/groups/:groupId/sessions
 * Newest first (up to 50), plus stats over all of the group's sessions:
 * per member games played, wins and last played; and how often each game
 * was played.
 */
export const listSessions = handle("listSessions", async (req, res) => {
    const group = await memberGroup(req, res);
    if (!group) return;

    const [sessions, perPlayer, perGame] = await Promise.all([
        GameSession.find({ groupId: group._id }).select("-screenshot").sort({ playedAt: -1 }).limit(50),
        GameSession.aggregate([
            { $match: { groupId: group._id } },
            { $unwind: "$players" },
            {
                $group: {
                    _id: "$players",
                    played: { $sum: 1 },
                    wins: { $sum: { $cond: [{ $eq: ["$winnerId", "$players"] }, 1, 0] } },
                    lastPlayedAt: { $max: "$playedAt" },
                },
            },
        ]),
        GameSession.aggregate([
            { $match: { groupId: group._id } },
            { $group: { _id: "$gameName", count: { $sum: 1 }, lastPlayedAt: { $max: "$playedAt" } } },
            { $sort: { count: -1, lastPlayedAt: -1 } },
        ]),
    ]);

    await group.populate("members", "username");
    const byId = new Map(perPlayer.map((p) => [String(p._id), p]));
    const players = group.members
        .map((m) => {
            const p = byId.get(String(m._id));
            return {
                userId: m._id,
                username: m.username,
                played: p?.played ?? 0,
                wins: p?.wins ?? 0,
                lastPlayedAt: p?.lastPlayedAt ?? null,
            };
        })
        .sort((a, b) => b.played - a.played || b.wins - a.wins || a.username.localeCompare(b.username));

    res.status(200).json({
        sessions: sessions.map(summary),
        stats: {
            total: perGame.reduce((n, g) => n + g.count, 0),
            players,
            games: perGame.map((g) => ({ name: g._id, count: g.count, lastPlayedAt: g.lastPlayedAt })),
        },
    });
});

/* GET /api/sessions/:sessionId/screenshot  (group members only) */
export const getScreenshot = handle("getScreenshot", async (req, res) => {
    const session = await GameSession.findById(req.params.sessionId);
    if (!session || !session.screenshot) return res.status(404).json({ message: "Screenshot not found" });
    const group = await Group.findById(session.groupId);
    if (!group || !group.hasMember(req.user._id)) {
        return res.status(403).json({ message: "You are not a member of this group" });
    }
    const [, type, data] = session.screenshot.match(/^data:(image\/[a-z+.-]+);base64,(.*)$/s);
    res.set("Content-Type", type);
    res.set("Cache-Control", "private, max-age=3600");
    res.set("X-Content-Type-Options", "nosniff");
    res.status(200).send(Buffer.from(data, "base64"));
});

/* DELETE /api/sessions/:sessionId  (whoever logged it, or a group admin) */
export const deleteSession = handle("deleteSession", async (req, res) => {
    const session = await GameSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    const group = await Group.findById(session.groupId);
    if (!group || !group.hasMember(req.user._id)) {
        return res.status(403).json({ message: "You are not a member of this group" });
    }
    if (!session.createdBy.equals(req.user._id) && !group.hasAdmin(req.user._id)) {
        return res.status(403).json({ message: "Only whoever logged it or a group admin can delete it" });
    }
    await session.deleteOne();
    io.to(groupRoom(group._id)).emit("session:removed", { _id: session._id, groupId: group._id });
    res.status(200).json({ message: "Deleted" });
});
