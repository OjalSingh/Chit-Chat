import mongoose from "mongoose";

/*
 * A Plan card: a live plan that lives inside a group chat.
 * Created by a member ("Make a plan") or by the AI detector when it
 * notices a plan forming in the conversation.
 */
const rsvpSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["going", "maybe", "out"], required: true },
    },
    { _id: false }
);

const timeOptionSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true, maxlength: 80 },
    startsAt: { type: Date },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const planSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 100 },
        where: { type: String, trim: true, maxlength: 120, default: "" },
        // When the plan is happening, once it is decided. whenText keeps the
        // human wording ("Sat 7am") for display; startsAt is machine-readable.
        whenText: { type: String, trim: true, maxlength: 80, default: "" },
        startsAt: { type: Date },
        timeOptions: [timeOptionSchema],
        rsvps: [rsvpSchema],
        status: { type: String, enum: ["open", "cancelled"], default: "open" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null when the AI made it
        source: { type: String, enum: ["member", "ai"], required: true },
        // Messages the AI read when it proposed this plan, for auditing.
        sourceMessageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    },
    { timestamps: true }
);

export const PLAN_LIMITS = { maxTimeOptions: 5 };

export default mongoose.model("Plan", planSchema);
