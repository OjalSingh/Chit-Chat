import mongoose from "mongoose";

/*
 * One player's attempt at one daily game on one day. Results belong to the
 * player, not to a group, so a score counts everywhere they are in.
 * `guesses` keeps both the word and its marks; other players only ever
 * see the marks (the coloured grid), never the words.
 */
const guessSchema = new mongoose.Schema(
    {
        word: { type: String, required: true },
        marks: { type: String, required: true },
    },
    { _id: false }
);

const gameResultSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        game: { type: String, required: true },
        dayKey: { type: String, required: true }, // "YYYY-MM-DD"
        guesses: [guessSchema],
        status: { type: String, enum: ["playing", "won", "lost"], default: "playing" },
        attempts: { type: Number, default: 0 }, // set when finished
        finishedAt: { type: Date },
    },
    { timestamps: true }
);

gameResultSchema.index({ userId: 1, game: 1, dayKey: 1 }, { unique: true });
gameResultSchema.index({ game: 1, dayKey: 1 });

export default mongoose.model("GameResult", gameResultSchema);
