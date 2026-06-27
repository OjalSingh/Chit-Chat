import express from 'express';
import { getAllFriends, getMessagesByUserId, sendMessage, getChatPartners} from '../controllers/message.controller.js';
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js"

const router = express.Router();

// the middleware execute in order - so requests ge rate limited first, then authenticated.
router.use(arcjetProtection,protectRoute);
router.get('/friends',   getAllFriends);
//need to execute in this order
router.get('/chats',  getChatPartners);  //people u have chats with
router.get('/:id',   getMessagesByUserId); // get all messages with that id
router.post('/send/:id',  sendMessage);

// router.get('/receive', (req, res) => {
//     res.send('Receive message route');
// });

export default router;