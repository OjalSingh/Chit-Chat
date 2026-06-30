import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

/*
 * Search for users by username.
 * This endpoint allows authenticated users to discover
 * other users they may want to send a friend request to.
 */

export const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate("friends", "username email profilePic");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.status(200).json(user.friends);

    } catch (error) {
        console.log("Error getting friends:", error);

        res.status(500).json({
            message: "Server error",
        });
    }
};

export const searchUsers = async (req, res) => {
    try {

        // Read the search text from the query string.
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({
                message: "Username is required.",
            });
        }

        /*
         * Search usernames using MongoDB's regular expression.
         *
         * $regex:
         *      Performs a partial text match.
         *
         * $options: "i"
         *      Makes the search case-insensitive.
         *
         */
        const users = await User.find({
            username: {
                $regex: username,
                $options: "i",
            },

            /*
             * Exclude the currently logged-in user.
             *
             * A user should never be able to send
             * themselves a friend request.
             */
            _id: {
                $ne: req.user._id,
            },
        })

            // Return only the fields needed by the frontend.

            .select("username email");

        res.status(200).json(users);

    } catch (error) {

        console.log("Error searching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/*
 * Send a friend request to another user.
 *
 * Endpoint:
 * POST /api/friends/request/:userId
 */
export const sendFriendRequest = async (req, res) => {
    try {
        // Receiver is provided in the URL.
        const receiverId = req.params.userId;

        // Sender is the authenticated user.
        const senderId = req.user._id;

        // Prevent users from sending requests to themselves.
        if (senderId.toString() === receiverId) {
            return res.status(400).json({ message: "You cannot add yourself." });
        }

        // Verify the receiver exists.
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "User not found." });
        }


        /*
         * Prevent duplicate requests
         * Check both directions because either
         * user may have already sent one.
         */
        const existingRequest =
            await FriendRequest.findOne({
                $or: [
                    { sender: senderId, receiver: receiverId },
                    { sender: receiverId, receiver: senderId, },
                ],
            });

        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already exists." });
        }



        // Create the pending request.
        const newRequest =
            await FriendRequest.create({
                sender: senderId,
                receiver: receiverId,
                status: "pending"
            });

        // Populate sender info for a clean UI integration on receipt
        const populatedRequest = await newRequest.populate("sender", "username email profilePic");

        //HYBRID REAL-TIME TRIGGER: Fire socket update if the receiver is online
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("friendRequestReceived", populatedRequest);
        }

        return res.status(201).json({ message: "Friend request sent successfully", request: populatedRequest });
    } catch (error) {
        console.log("Error sending friend request:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/*
 * Return all pending friend requests that were
 * sent to the authenticated user.
 *
 * Endpoint:
 * GET /api/friends/requests
 */
export const getFriendRequests = async (req, res) => {
    try {

        // The logged-in user is the receiver.
        const userId = req.user._id;

        /*
         * Find all pending requests addressed to this user.
         * Populate the sender so the frontend immediately receives the sender's username and email.
         */
        const requests = await FriendRequest.find({
            receiver: userId,
            status: "pending",
        })
            .populate("sender", "username email")
            .sort({ createdAt: -1 });


        res.status(200).json(requests);

    } catch (error) {

        console.log(
            "Error fetching friend requests:", error);

        res.status(500).json({ message: "Internal Server Error" });
    }
};

/*
 * Accept a friend request.
 * This makes both users "friends".
 *
 * Endpoint:
 * PATCH /api/friends/accept/:requestId
 */
export const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Only receiver can accept
        if (
            friendRequest.receiver.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: "Not allowed" });
        }
        if (friendRequest.status !== "pending") {
            return res.status(400).json({
                message: "Request already processed"
            });
        }
        //Update status
        await FriendRequest.findByIdAndDelete(requestId);

        //add to each other's friend list
        await User.findByIdAndUpdate(friendRequest.sender, { $addToSet: { friends: friendRequest.receiver } });

        await User.findByIdAndUpdate(friendRequest.receiver, { $addToSet: { friends: friendRequest.sender } });


        //REAL-TIME TRIGGER: Alert the original sender that their request was accepted
        const senderSocketId = getReceiverSocketId(friendRequest.sender.toString());
        if (senderSocketId) {
            io.to(senderSocketId).emit("friendRequestUpdated", {
                requestId,
                status: "accepted",
                actionBy: req.user._id
            });
        }


        const receiverSocketId = getReceiverSocketId(
            friendRequest.receiver.toString()
        );

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("friendRequestUpdated", {
                requestId,
                status: "accepted",
                actionBy: req.user._id
            });
        }


        res.status(200).json({ message: "Friend request accepted", friendRequest });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
};

/*
 * Reject a friend request.
 *
 * Endpoint:
 * PATCH /api/friends/reject/:requestId
 */
export const rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;

        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (
            friendRequest.receiver.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: "Not allowed" });
        }


        //  deleting in the schema collection lean for multi-retry attempts later
        await FriendRequest.findByIdAndDelete(requestId);

        // REAL-TIME TRIGGER: Notify the sender to clear pending flags or loaders
        const senderSocketId = getReceiverSocketId(friendRequest.sender.toString());
        if (senderSocketId) {
            io.to(senderSocketId).emit("friendRequestUpdated", {
                requestId,
                status: "rejected",
                actionBy: req.user._id
            });
        }

        return res.status(200).json({ message: "Friend request rejected successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Server error",
        });
    }
};