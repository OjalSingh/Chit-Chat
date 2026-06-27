import Message from "../models/Message.js"
import User from "../models/User.js"


export const getAllFriends = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password")
        res.status(200).json(filteredUsers);     
    } catch (error){

        console.log("Error in getAllFriends:", error);
        res.status(500).json({message: "Server error"});
    }

};

export const getMessagesByUserId = async (req, res) => {
    try{
        const myId =req.user._id;
        const {id:userToChatId} = req.params

        const message =await Message.find({
            $or: [
                {senderId:myId, receiverId: userToChatId},
                {receiverId:myId, senderId: userToChatId},
            ],
        });

        res.status(200).json(message);

    } catch (error) {
        console.log("Error in getMessages contorller:", error);
        res.status(500).json({ error: "Server error"});
    }
};

export const sendMessage = async (req, res) => {
    try{
        const {text, image} = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;
        
        if(!text && !image){
                return res.status(400).json({ message: "Text or image is required"});
        }
        if(senderId.equals(receiverId)){
                return res.status(400).json({ message: "Cannot send messgaes to yourself"});
        }
        const receiverExists = await User.exists({ _id: receiverId});
        if(!receiverExists){
                return res.status(404).json({ message: "User not found"});
        }

        // let imageUrl:
        // if(image){
        //     //Upload to cloudinary
        //     const uploadResponse =a 
        // }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image,
        });

        await newMessage.save();

        //todo: send irt if online

        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in getMessages contorller:", error);
        res.status(500).json({ error: "Server error"});
    }
};

export const getChatPartners =async (req, res) => {
    try{
        const loggedInUserId = req.user._id;

        //find all the messages the logged in user has sent or recieved
        const messages =await Message.find({
            $or: [
                {senderId: loggedInUserId}, {receiverId:loggedInUserId},
            ],
        });

        //get the other user
        const chatPartnerIds = [
            ...new Set(
                messages.map((msg) => 
                    msg.senderId.toString() === loggedInUserId.toString() 
                        ? msg.receiverId.toString() : msg.senderId.toString() )
                    ),
                ];

    const chatPartners = await User.find({ _id: {$in:chatPartnerIds}}).select("-password")
    res.status(200).json(chatPartners);

    }catch(error){
        console.log("Error in getChatPartners:", error);
        res.status(500).json({ error: "Server error"});
    }
};
