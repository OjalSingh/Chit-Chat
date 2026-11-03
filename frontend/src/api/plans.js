import client from "./client";

export const getPlans = async (groupId) => (await client.get(`/groups/${groupId}/plans`)).data;

export const createPlan = async (groupId, plan) => (await client.post(`/groups/${groupId}/plans`, plan)).data;

// Asks the AI to read the chat now. Resolves to the new plan, or null.
export const detectPlan = async (groupId) => (await client.post(`/groups/${groupId}/plans/detect`)).data.plan;

export const rsvpPlan = async (planId, status) => (await client.post(`/plans/${planId}/rsvp`, { status })).data;

export const votePlan = async (planId, optionId) => (await client.post(`/plans/${planId}/vote`, { optionId })).data;

export const updatePlan = async (planId, changes) => (await client.patch(`/plans/${planId}`, changes)).data;
