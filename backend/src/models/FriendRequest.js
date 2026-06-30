import mongoose from "mongoose";

/*
 * A FriendRequest represents the relationship between
 * two users before they become friends.
 *
 * sender   -> user who sent the request
 * receiver -> user receiving the request
 * status   -> current state of the request
 */
const friendRequestSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,

            // Restrict status to one of these values.
            enum: [
                "pending",
                "accepted",
                "rejected",
            ],

            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "FriendRequest",
    friendRequestSchema
);