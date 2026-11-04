import client, { API_URL } from "./client";

export const getCatalog = async () => (await client.get("/games/catalog")).data;

export const logSession = async (groupId, session) => (await client.post(`/groups/${groupId}/sessions`, session)).data;

export const getSessions = async (groupId) => (await client.get(`/groups/${groupId}/sessions`)).data;

export const deleteSession = async (sessionId) => (await client.delete(`/sessions/${sessionId}`)).data;

// For <img crossOrigin="use-credentials">: the cookie authorises the request.
export const screenshotUrl = (sessionId) => `${API_URL}/api/sessions/${sessionId}/screenshot`;
