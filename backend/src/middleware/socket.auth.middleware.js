import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

export const socketAuthMiddleware = async (socket, next) => {
    try{
        //extract token from http-only cookies
        const token = socket.handshake.headers.cookie
        ?.split("; ")
        .find((row) => row.startsWith("jwt="))
        ?.split("=")[1];
        
        if(!token) {
            console.log("Socket connection rejected: No token provided");
            return next(new Error("Unauthorized - No Token Provided"));
        }

        // verify the token
        const decoded = jwt.verify(token, ENV.JWT_SECRET); // Verify the token using the secret key 
        if(!decoded) {
            console.log("Socket connection rejected: Invalid Token");
            return next(new Error("Unauthorized - Invalid Token"));
        }

        // find user from db
          const user = await User.findById(decoded.userId).select('-password'); // Find the user by ID from the decoded token
        if (!user) {
            console.log("Socket connection rejected: User Not Found");
            return next(new Error("User Not Found"));
        }
        

        // attach user info socket
        socket.user = user;
        socket.userId = user._id.toString();
        next();

        console.log(`Socket authenticated for user: ${user.username} (${user._id})`);

    } catch(error){
        console.log("Error in socket authentication:", error.message);
        next(new Error("Unatuhorized-Authenication failed"))

        }

}