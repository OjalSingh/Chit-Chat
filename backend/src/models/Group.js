import mongoose from "mongoose";

/*
 * A Group is a named conversation between 3+ people.
 * Messages to a group carry groupId instead of receiverId.
 *
 * members -> everyone who can read and post (includes admins)
 * admins  -> members who can add or remove others
 * invited -> friends asked to join who haven't said yes yet. They can't
 *            read anything until they accept.
 */
const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        invited: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

groupSchema.index({ members: 1 });
groupSchema.index({ invited: 1 });

groupSchema.methods.hasMember = function (userId) {
    return this.members.some((m) => (m._id ?? m).equals(userId));
};

groupSchema.methods.hasAdmin = function (userId) {
    return this.admins.some((a) => (a._id ?? a).equals(userId));
};

groupSchema.methods.hasInvite = function (userId) {
    return this.invited.some((i) => (i._id ?? i).equals(userId));
};

export const MAX_GROUP_MEMBERS = 100;

export default mongoose.model("Group", groupSchema);
