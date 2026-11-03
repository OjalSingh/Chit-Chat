import { io, groupRoom } from "../lib/socket.js";

/*
 * Every Plan change goes out to the whole group room, so all members'
 * cards update live. "plan:new" for a new card, "plan:update" for edits,
 * RSVPs and votes.
 */
export const emitPlan = (plan, event = "plan:update") => {
    io.to(groupRoom(plan.groupId)).emit(event, plan);
};
