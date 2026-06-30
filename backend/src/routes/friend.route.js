import express from 'express';
import {  searchUsers,
      sendFriendRequest,
      getFriendRequests,
      acceptFriendRequest, 
      rejectFriendRequest, 
      getFriends
    } from '../controllers/friend.controller.js';
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js"

const router = express.Router();

router.use(protectRoute, arcjetProtection);

router.get("/search", searchUsers);

router.get("/requests", getFriendRequests);

router.get("/", getFriends);

router.post("/request/:userId", sendFriendRequest);

router.patch("/accept/:requestId", acceptFriendRequest);

router.patch("/reject/:requestId", rejectFriendRequest);


export default router;