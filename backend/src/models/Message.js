import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Exactly one of receiverId (direct message) or groupId (group message) is set.
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () { return !this.groupId; },
        },

        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            index: true,
        },

        text: {
            type: String,
            trim: true,
            maxlength: 2000
        },

        image: {
            type: String,
            
        },

        },
        {  timestamps: true }
);

messageSchema.pre("validate", function (next) {
    if (this.groupId && this.receiverId) {
        return next(new Error("A message goes to a user or a group, not both"));
    }
    next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
