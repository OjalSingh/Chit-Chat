import mongoose from "mongoose";

/*
 * A player's best score in the tap-to-flap game. One row per player, so a
 * score counts in every room they are in. Scores are reported by the
 * browser, so this is a for-fun board, not a competition with prizes.
 */
const flapScoreSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        best: { type: Number, default: 0 },
        plays: { type: Number, default: 0 },
        lastPlayedAt: { type: Date },
    },
    { timestamps: true }
);

export const FLAP_MAX_SCORE = 500;

export default mongoose.model("FlapScore", flapScoreSchema);
