import client from "./client";

export const getGroups = async () => {
    const res = await client.get("/groups");
    return res.data;
};

export const createGroup = async (name, memberIds) => {
    const res = await client.post("/groups", { name, memberIds });
    return res.data;
};

export const getGroupMessages = async (groupId) => {
    const res = await client.get(`/groups/${groupId}/messages`);
    return res.data;
};

export const sendGroupMessage = async (groupId, text) => {
    const res = await client.post(`/groups/${groupId}/messages`, { text });
    return res.data;
};

export const addGroupMembers = async (groupId, memberIds) => {
    const res = await client.post(`/groups/${groupId}/members`, { memberIds });
    return res.data;
};

export const leaveGroup = async (groupId, userId) => {
    const res = await client.delete(`/groups/${groupId}/members/${userId}`);
    return res.data;
};

export const getInvites = async () => (await client.get("/groups/invites")).data;

export const acceptInvite = async (groupId) => (await client.post(`/groups/${groupId}/accept`)).data;

export const declineInvite = async (groupId) => (await client.post(`/groups/${groupId}/decline`)).data;
