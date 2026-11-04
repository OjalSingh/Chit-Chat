import mongoose from "mongoose";
import Group, { MAX_GROUP_MEMBERS } from "../models/Group.js";
import Message from "../models/Message.js";
import Plan from "../models/Plan.js";
import {
    io,
    getReceiverSocketId,
    groupRoom,
    joinGroupRoom,
    leaveGroupRoom,
} from "../lib/socket.js";
import { scheduleDetection } from "../services/planDetector.js";

const MEMBER_FIELDS = "username email";

/*
 * Returns the ids in `ids` that are not friends of `user`.
 * Groups can only be built from friends, which keeps strangers
 * from pulling people into conversations they never agreed to.
 */
const nonFriends = (user, ids) => {
    const friendIds = new Set(user.friends.map((f) => f.toString()));
    return ids.filter((id) => !friendIds.has(id));
};

const uniqueIds = (ids) => [...new Set(ids.map(String))];

/*
 * Loads a group and checks the caller is a member.
 * Sends the error response itself and returns null on failure.
 */
const loadGroupForMember = async (req, res) => {
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

/* What an invited person sees: enough to decide, nothing from inside the group. */
const invitePayload = async (group) => {
    await group.populate("createdBy", "username");
    return {
        _id: group._id,
        name: group.name,
        invitedBy: group.createdBy?.username ?? "someone",
        memberCount: group.members.length,
    };
};

const notifyMembers = (userIds, event, payload) => {
    for (const id of userIds) {
        const socketId = getReceiverSocketId(id.toString());
        if (socketId) io.to(socketId).emit(event, payload);
    }
};

/*
 * POST /api/groups
 * Body: { name, memberIds: [userId, ...] }
 */
export const createGroup = async (req, res) => {
    try {
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        const memberIds = Array.isArray(req.body.memberIds) ? uniqueIds(req.body.memberIds) : null;
        const me = req.user._id.toString();

        if (!name) {
            return res.status(400).json({ message: "Group name is required" });
        }
        if (name.length > 60) {
            return res.status(400).json({ message: "Group name must be 60 characters or fewer" });
        }
        if (!memberIds || memberIds.length === 0) {
            return res.status(400).json({ message: "Add at least one friend to the group" });
        }
        if (!memberIds.every((id) => mongoose.isValidObjectId(id))) {
            return res.status(400).json({ message: "Invalid member id" });
        }

        const others = memberIds.filter((id) => id !== me);
        if (others.length + 1 > MAX_GROUP_MEMBERS) {
            return res.status(400).json({ message: `Groups are limited to ${MAX_GROUP_MEMBERS} members` });
        }
        if (nonFriends(req.user, others).length > 0) {
            return res.status(400).json({ message: "You can only add your friends to a group" });
        }

        const group = await Group.create({
            name,
            createdBy: req.user._id,
            members: [req.user._id],
            admins: [req.user._id],
            invited: others,
        });
        await group.populate("members", MEMBER_FIELDS);

        joinGroupRoom([req.user._id], group._id);
        notifyMembers(others, "groupInvite", await invitePayload(group));

        res.status(201).json(group);
    } catch (error) {
        console.log("Error in createGroup:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/*
 * GET /api/groups
 * Groups the caller belongs to, most recently active first.
 */
export const getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate("members", MEMBER_FIELDS)
            .sort({ updatedAt: -1 });
        res.status(200).json(groups);
    } catch (error) {
        console.log("Error in getMyGroups:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* GET /api/groups/:groupId */
export const getGroup = async (req, res) => {
    try {
        const group = await loadGroupForMember(req, res);
        if (!group) return;
        await group.populate("members", MEMBER_FIELDS);
        res.status(200).json(group);
    } catch (error) {
        console.log("Error in getGroup:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* GET /api/groups/:groupId/messages */
export const getGroupMessages = async (req, res) => {
    try {
        const group = await loadGroupForMember(req, res);
        if (!group) return;
        const messages = await Message.find({ groupId: group._id })
            .populate("senderId", "username")
            .sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getGroupMessages:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/*
 * POST /api/groups/:groupId/messages
 * Body: { text, image }
 * Persists the message, then pushes it to every other member's socket
 * through the group's room.
 */
export const sendGroupMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        if (!text && !image) {
            return res.status(400).json({ message: "Text or image is required" });
        }

        const group = await loadGroupForMember(req, res);
        if (!group) return;

        const message = await Message.create({
            senderId: req.user._id,
            groupId: group._id,
            text,
            image,
        });
        await message.populate("senderId", "username");

        // Bump updatedAt so the sidebar can sort groups by activity.
        await Group.updateOne({ _id: group._id }, { $currentDate: { updatedAt: true } });

        const senderSocketId = getReceiverSocketId(req.user._id.toString());
        const room = io.to(groupRoom(group._id));
        (senderSocketId ? room.except(senderSocketId) : room).emit("newGroupMessage", message);

        // Let the AI look for a plan once the chat goes quiet.
        scheduleDetection(group._id);

        res.status(201).json(message);
    } catch (error) {
        console.log("Error in sendGroupMessage:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/*
 * POST /api/groups/:groupId/members
 * Body: { memberIds: [userId, ...] }   (admins only, friends of the admin only)
 */
export const addMembers = async (req, res) => {
    try {
        const memberIds = Array.isArray(req.body.memberIds) ? uniqueIds(req.body.memberIds) : [];
        if (memberIds.length === 0 || !memberIds.every((id) => mongoose.isValidObjectId(id))) {
            return res.status(400).json({ message: "Provide memberIds to add" });
        }

        const group = await loadGroupForMember(req, res);
        if (!group) return;
        if (!group.hasAdmin(req.user._id)) {
            return res.status(403).json({ message: "Only group admins can add members" });
        }

        const newIds = memberIds.filter((id) => !group.hasMember(id) && !group.hasInvite(id));
        if (nonFriends(req.user, newIds).length > 0) {
            return res.status(400).json({ message: "You can only add your friends to a group" });
        }
        if (group.members.length + group.invited.length + newIds.length > MAX_GROUP_MEMBERS) {
            return res.status(400).json({ message: `Groups are limited to ${MAX_GROUP_MEMBERS} members` });
        }

        group.invited.push(...newIds);
        await group.save();
        await group.populate("members", MEMBER_FIELDS);

        notifyMembers(newIds, "groupInvite", await invitePayload(group));
        io.to(groupRoom(group._id)).emit("groupUpdated", group);

        res.status(200).json(group);
    } catch (error) {
        console.log("Error in addMembers:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/*
 * GET /api/groups/invites
 * Groups the caller has been asked to join.
 */
export const getMyInvites = async (req, res) => {
    try {
        const groups = await Group.find({ invited: req.user._id }).populate("createdBy", "username").sort({ updatedAt: -1 });
        res.status(200).json(
            groups.map((g) => ({
                _id: g._id,
                name: g.name,
                invitedBy: g.createdBy?.username ?? "someone",
                memberCount: g.members.length,
            }))
        );
    } catch (error) {
        console.log("Error in getMyInvites:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/*
 * POST /api/groups/:groupId/accept   |   POST /api/groups/:groupId/decline
 * Only the invited person can answer. Joining is always their own choice.
 */
const answerInvite = (accept) => async (req, res) => {
    try {
        const { groupId } = req.params;
        // Atomic, so a double tap or a stale tab can't join twice.
        const update = accept
            ? { $pull: { invited: req.user._id }, $addToSet: { members: req.user._id } }
            : { $pull: { invited: req.user._id } };
        const group = await Group.findOneAndUpdate({ _id: groupId, invited: req.user._id }, update, { new: true });
        if (!group) return res.status(404).json({ message: "No invite to that group" });

        if (!accept) return res.status(200).json({ message: "Declined" });

        await group.populate("members", MEMBER_FIELDS);
        joinGroupRoom([req.user._id], group._id);
        io.to(groupRoom(group._id)).emit("groupUpdated", group);
        res.status(200).json(group);
    } catch (error) {
        console.log("Error in answerInvite:", error);
        res.status(500).json({ message: "Server error" });
    }
};
export const acceptInvite = answerInvite(true);
export const declineInvite = answerInvite(false);

/*
 * DELETE /api/groups/:groupId/members/:userId
 * Admins can remove anyone; any member can remove themselves (leave).
 * If the last admin leaves, the longest-standing member is promoted.
 * If the last member leaves, the group and its messages are deleted.
 */
export const removeMember = async (req, res) => {
    try {
        const { userId } = req.params;
        const group = await loadGroupForMember(req, res);
        if (!group) return;

        const isSelf = req.user._id.equals(userId);
        if (!isSelf && !group.hasAdmin(req.user._id)) {
            return res.status(403).json({ message: "Only group admins can remove members" });
        }
        if (!group.hasMember(userId)) {
            return res.status(404).json({ message: "That user is not in this group" });
        }

        group.members = group.members.filter((m) => !m.equals(userId));
        group.admins = group.admins.filter((a) => !a.equals(userId));

        leaveGroupRoom(userId, group._id);
        notifyMembers([userId], "groupRemoved", { groupId: group._id });

        if (group.members.length === 0) {
            await Message.deleteMany({ groupId: group._id });
            await Plan.deleteMany({ groupId: group._id });
            await group.deleteOne();
            return res.status(200).json({ message: "Group deleted" });
        }

        if (group.admins.length === 0) {
            group.admins = [group.members[0]];
        }
        await group.save();
        await group.populate("members", MEMBER_FIELDS);
        io.to(groupRoom(group._id)).emit("groupUpdated", group);

        res.status(200).json(group);
    } catch (error) {
        console.log("Error in removeMember:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/*
 * PATCH /api/groups/:groupId
 * Body: { name }   (admins only)
 */
export const renameGroup = async (req, res) => {
    try {
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        if (!name || name.length > 60) {
            return res.status(400).json({ message: "Group name must be 1 to 60 characters" });
        }
        const group = await loadGroupForMember(req, res);
        if (!group) return;
        if (!group.hasAdmin(req.user._id)) {
            return res.status(403).json({ message: "Only group admins can rename the group" });
        }
        group.name = name;
        await group.save();
        await group.populate("members", MEMBER_FIELDS);
        io.to(groupRoom(group._id)).emit("groupUpdated", group);
        res.status(200).json(group);
    } catch (error) {
        console.log("Error in renameGroup:", error);
        res.status(500).json({ message: "Server error" });
    }
};

