import Message from "../models/Message.js";
import Plan from "../models/Plan.js";
import { ENV } from "../lib/env.js";
import { extractPlan } from "./planExtractor.js";
import { emitPlan } from "./planEvents.js";

/*
 * Debounced AI plan detection.
 *
 * Every group message resets a per-group timer. When a group has been
 * quiet for PLAN_DEBOUNCE_MS, we read its recent messages once and, if a
 * plan is forming, post a Plan card. Debouncing keeps cost at roughly one
 * model call per burst of conversation instead of one per message.
 */

const timers = new Map();
const running = new Set();

export const aiAvailable = () =>
    ENV.PLAN_DETECTION !== "off" &&
    Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

/** Called after every group message. Cheap: only (re)arms a timer. */
export function scheduleDetection(groupId) {
    if (!aiAvailable()) return;
    const key = groupId.toString();
    clearTimeout(timers.get(key));
    const timer = setTimeout(() => {
        timers.delete(key);
        detectPlan(key).catch((error) => console.log("Plan detection failed:", error.message));
    }, ENV.PLAN_DEBOUNCE_MS);
    timer.unref?.();
    timers.set(key, timer);
}

/**
 * Reads the group's recent messages and creates an AI Plan card if a new
 * plan is forming. Returns the plan, or null when there is nothing to add.
 */
export async function detectPlan(groupId) {
    const key = groupId.toString();
    if (running.has(key)) return null; // one model call per group at a time
    running.add(key);
    try {
        const recent = await Message.find({ groupId: key, text: { $exists: true, $ne: "" } })
            .sort({ createdAt: -1 })
            .limit(ENV.PLAN_CONTEXT_MESSAGES)
            .populate("senderId", "username");
        if (recent.length < 2) return null;
        recent.reverse();

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const openPlans = await Plan.find({ groupId: key, status: "open", createdAt: { $gte: weekAgo } });

        const found = await extractPlan({
            messages: recent.map((m) => ({
                senderName: m.senderId?.username ?? "someone",
                text: m.text,
                createdAt: m.createdAt,
            })),
            openPlans,
            now: new Date(),
        });
        if (!found) return null;

        // Belt and braces: the model is told about open plans, but never
        // post a second card with the same title.
        const duplicate = openPlans.some((p) => p.title.toLowerCase() === found.title.toLowerCase());
        if (duplicate) return null;

        const plan = await Plan.create({
            groupId: key,
            title: found.title,
            where: found.where,
            whenText: found.whenText,
            startsAt: found.startsAt,
            timeOptions: found.timeOptions,
            source: "ai",
            sourceMessageIds: recent.map((m) => m._id),
        });
        emitPlan(plan, "plan:new");
        return plan;
    } finally {
        running.delete(key);
    }
}

/** Test helper: cancels pending timers. */
export const __resetDetector = () => {
    timers.forEach(clearTimeout);
    timers.clear();
    running.clear();
};
