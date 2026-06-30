import client from "./client";

export const searchUsers = async (username) => {
    const res = await client.get("/friends/search", 
        {params: {username},
    });

    return res.data;
};


export const getFriends = async () => {
    const res = await client.get("/friends");
    return res.data;
};

export const sendFriendRequest = async (userId) => {
    const res = await client.post(`/friends/request/${userId}`);
    return res.data;
    
};

export const getFriendRequests = async () => {
    const res = await client.get("/friends/requests/");

    return res.data;
};

export const acceptFriendRequest = async (requestId) => {
    const res = await client.patch(`/friends/accept/${requestId}`);
    return res.data;
};

export const rejectFriendRequest = async (requestId) => {
    const res = await client.patch(`/friends/reject/${requestId}`);
    return res.data;
};