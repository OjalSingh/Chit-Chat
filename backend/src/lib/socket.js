import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const app = express();
const server = http.createServer(app);
//socketServer
const io = new Server(server, {
    cors: {
        origin: ENV.CLIENT_URL,
        credentials: true,
    },
});
// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// this is for storing online users
const userSocketMap = {}; // key-val pairs {userId:socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.user.username)

    const userId = socket.userId
    userSocketMap[userId] = socket.id;

    // Subscribe this socket to every group the user belongs to,
    // so group events reach it with a single io.to(room) call.
    // Runs in the background so the handlers below are registered immediately.
    Group.find({ members: userId })
        .select("_id")
        .then((groups) => {
            socket.join(groups.map((g) => groupRoom(g._id)));
            socket.emit("groupsJoined");
        })
        .catch((error) => console.log("Error joining group rooms:", error));

    //io.emit is used to send events to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    /*
     * "Is typing" pings. Body: { to } for a friend, or { groupId } for a room.
     * Only friends (or fellow room members) ever see it, it carries no text,
     * and a socket can send at most one a second.
     */
    let lastTyping = 0;
    socket.on("typing", async (payload = {}) => {
        try {
            const now = Date.now();
            if (now - lastTyping < 1000) return;
            lastTyping = now;
            const { to, groupId } = payload;
            const from = { userId, username: socket.user.username };
            if (typeof groupId === "string" && mongoose.isValidObjectId(groupId)) {
                if (socket.rooms.has(groupRoom(groupId))) socket.to(groupRoom(groupId)).emit("typing", { ...from, groupId });
            } else if (typeof to === "string" && mongoose.isValidObjectId(to)) {
                const receiverSocketId = userSocketMap[to];
                if (receiverSocketId && (await User.exists({ _id: userId, friends: to }))) {
                    io.to(receiverSocketId).emit("typing", from);
                }
            }
        } catch (error) {
            console.log("Error handling typing:", error.message);
        }
    });

    //Handle friend request sending
    socket.on("sendFriendRequest", ({ receiverId, request }) => {
        const receiverSocketId = userSocketMap[receiverId];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit(
                "friendRequestReceived",
                request
            );
        }
    });

    socket.on("friendRequestUpdated", ({ receiverId }) => {
        const receiverSocketId = userSocketMap[receiverId];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit(
                "friendRequestUpdated"
                );
            }
        });

        //socket.on to listen
        socket.on("disconnect", () => {
                console.log("A user disconnected", socket.user.username);
                delete userSocketMap[userId];
                io.emit("getOnlineUsers", Object.keys(userSocketMap));
            });
        });


        /*
         * Returns the Socket.IO socket ID associated with a user.
         * Message controllers use this to determine whether the
         * recipient is currently online before emitting events.
         */
        export const getReceiverSocketId = (userId) => {
            return userSocketMap[userId];
        };

        /** Socket.IO room name for a group's members. */
        export const groupRoom = (groupId) => `group:${groupId}`;

        /** Subscribes online users' sockets to a group's room, e.g. after they are added. */
        export const joinGroupRoom = (userIds, groupId) => {
            for (const id of userIds) {
                const socketId = userSocketMap[id.toString()];
                if (socketId) io.in(socketId).socketsJoin(groupRoom(groupId));
            }
        };

        /** Unsubscribes a user's socket from a group's room, e.g. after they leave. */
        export const leaveGroupRoom = (userId, groupId) => {
            const socketId = userSocketMap[userId.toString()];
            if (socketId) io.in(socketId).socketsLeave(groupRoom(groupId));
        };

        export { io, app, server }