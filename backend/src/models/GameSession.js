import mongoose from "mongoose";

/*
 * A record of a game a group played together: which game, when, who was
 * there, who won, and optionally a screenshot of the scoreboard. Chit-Chat
 * doesn't run these games, so the group logs them by hand after playing.
 */
const gameSessionSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
        planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
        gameName: { type: String, required: true, trim: true, maxlength: 60 },
        playedAt: { type: Date, default: Date.now },
        players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        winnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: { type: String, trim: true, maxlength: 200, default: "" },
        // A resized image as a data URL. Served by its own endpoint so lists stay small.
        screenshot: { type: String },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

gameSessionSchema.index({ groupId: 1, playedAt: -1 });

export const SCREENSHOT_PATTERN = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
export const SCREENSHOT_MAX_CHARS = 1_000_000; // about 750 KB of image

export default mongoose.model("GameSession", gameSessionSchema);
