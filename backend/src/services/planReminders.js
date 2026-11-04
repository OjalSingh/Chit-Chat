import Plan from "../models/Plan.js";
import { io, groupRoom } from "../lib/socket.js";
import { ENV } from "../lib/env.js";

/*
 * Plan reminders: one in the group 1 hour before a plan starts and one
 * 5 minutes before. A plan created inside the last hour gets only the
 * reminder that matches how close it is. Each reminder is claimed with an
 * atomic update, so it goes out once even if two server processes tick at
 * the same moment.
 */

const HOUR = 60 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

/**
 * Finds the reminders due at `now`, marks them sent, and returns them as
 * [{ plan, stage: "h1" | "m5", minutes }]. Does not emit anything itself.
 */
export async function runReminders(now = new Date()) {
    const due = await Plan.find({
        status: "open",
        startsAt: { $gt: now, $lte: new Date(now.getTime() + HOUR) },
        $or: [{ "reminders.h1": { $ne: true } }, { "reminders.m5": { $ne: true } }],
    });

    const sent = [];
    for (const candidate of due) {
        const left = candidate.startsAt.getTime() - now.getTime();
        const stage = left <= FIVE_MIN ? "m5" : "h1";
        // m5 also covers h1: nobody needs "1 hour" after "5 minutes".
        const set = stage === "m5" ? { "reminders.m5": true, "reminders.h1": true } : { "reminders.h1": true };
        const claimed = await Plan.findOneAndUpdate(
            { _id: candidate._id, status: "open", startsAt: candidate.startsAt, [`reminders.${stage}`]: { $ne: true } },
            { $set: set },
            { new: true }
        );
        if (claimed) sent.push({ plan: claimed, stage, minutes: Math.max(1, Math.round(left / 60000)) });
    }
    return sent;
}

export function emitReminder({ plan, stage, minutes }) {
    io.to(groupRoom(plan.groupId)).emit("plan:reminder", {
        planId: plan._id,
        groupId: plan.groupId,
        title: plan.title,
        startsAt: plan.startsAt,
        meetLink: plan.meetLink,
        stage,
        minutes,
    });
}

/** Starts the 30 second ticker. Called once from server.js, not from tests. */
export function startReminderScheduler(intervalMs = 30_000) {
    if (ENV.PLAN_REMINDERS === "off") return null;
    const timer = setInterval(async () => {
        try {
            for (const reminder of await runReminders()) emitReminder(reminder);
        } catch (error) {
            console.log("Plan reminders failed:", error.message);
        }
    }, intervalMs);
    timer.unref?.();
    return timer;
}
