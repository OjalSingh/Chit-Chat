import client from "./client";

export const getFriends = async () => {
    const res = await client.get("/messages/friends");
    return res.data;
};

export const getMessages = async (userId) => {
    const res = await client.get(`/messages/${userId}`);
    return res.data;
};

export const sendMessage = async (userId, text) => {
    const res = await client.post(`/messages/send/${userId}`, {
        text,
    });

    return res.data;
};