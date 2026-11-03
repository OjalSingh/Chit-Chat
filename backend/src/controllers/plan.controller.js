import mongoose from "mongoose";
import Group from "../models/Group.js";
import Plan, { PLAN_LIMITS } from "../models/Plan.js";
import { emitPlan } from "../services/planEvents.js";
import { aiAvailable, detectPlan } from "../services/planDetector.js";

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : undefined);

const parseDate = (value) => {
    if (value === null || value === "") return null;
    if (value === undefined) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "invalid" : d;
};

/* Loads the group from :groupId and checks membership. */
const groupForMember = async (req, res) => {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
        res.status(404).json({ message: "Group not found" });
        return null;
    }
    if (!group.hasMember(req.user._id)) {
        res.status(403).json({ message: "You are not a member of this group" });
        return null;
    }
    return group;
};

/* Loads the plan from :planId and checks the caller is in its group. */
const planForMember = async (req, res) => {
    const plan = await Plan.findById(req.params.planId);
    if (!plan) {
        res.status(404).json({ message: "Plan not found" });
        return {};
    }
    const group = await Group.findById(plan.groupId);
    if (!group || !group.hasMember(req.user._id)) {
        res.status(403).json({ message: "You are not a member of this group" });
        return {};
    }
    return { plan, group };
};

const handle = (name, fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        console.log(`Error in ${name}:`, error);
        res.status(500).json({ message: "Server error" });
    }
};

/* GET /api/groups/:groupId/plans  (open plans, newest first) */
export const listPlans = handle("listPlans", async (req, res) => {
    const group = await groupForMember(req, res);
    if (!group) return;
    const plans = await Plan.find({ groupId: group._id, status: "open" }).sort({ createdAt: -1 });
    res.status(200).json(plans);
});

/*
 * POST /api/groups/:groupId/plans
 * Body: { title, where?, whenText?, startsAt?, timeOptions?: [label, ...] }
 * A member starts a plan by hand. The creator is marked as going.
 */
export const createPlan = handle("createPlan", async (req, res) => {
    const group = await groupForMember(req, res);
    if (!group) return;

    const title = clean(req.body.title, 100);
    if (!title) return res.status(400).json({ message: "A plan needs a title" });
    const startsAt = parseDate(req.body.startsAt);
    if (startsAt === "invalid") return res.status(400).json({ message: "Invalid startsAt" });

    const labels = Array.isArray(req.body.timeOptions) ? req.body.timeOptions : [];
    if (labels.length > PLAN_LIMITS.maxTimeOptions) {
        return res.status(400).json({ message: `At most ${PLAN_LIMITS.maxTimeOptions} time options` });
    }

    const plan = await Plan.create({
        groupId: group._id,
        title,
        where: clean(req.body.where, 120) ?? "",
        whenText: clean(req.body.whenText, 80) ?? "",
        startsAt: startsAt ?? undefined,
        timeOptions: labels.map((l) => clean(l, 80)).filter(Boolean).map((label) => ({ label })),
        rsvps: [{ userId: req.user._id, status: "going" }],
        createdBy: req.user._id,
        source: "member",
    });
    emitPlan(plan, "plan:new");
    res.status(201).json(plan);
});

/*
 * POST /api/groups/:groupId/plans/detect
 * Runs the AI detector now instead of waiting for the chat to go quiet.
 */
export const detectNow = handle("detectNow", async (req, res) => {
    const group = await groupForMember(req, res);
    if (!group) return;
    if (!aiAvailable()) {
        return res.status(503).json({ message: "AI plan detection is not configured on this server" });
    }
    const plan = await detectPlan(group._id);
    res.status(200).json({ plan });
});

/*
 * POST /api/plans/:planId/rsvp
 * Body: { status: "going" | "maybe" | "out" }
 */
export const rsvp = handle("rsvp", async (req, res) => {
    const { status } = req.body;
    if (!["going", "maybe", "out"].includes(status)) {
        return res.status(400).json({ message: "status must be going, maybe or out" });
    }
    const { plan } = await planForMember(req, res);
    if (!plan) return;
    if (plan.status !== "open") return res.status(400).json({ message: "This plan was cancelled" });

    // Atomic updates, so members tapping at the same moment don't
    // overwrite each other's RSVPs (a load-modify-save would).
    const me = req.user._id;
    const changed = await Plan.updateOne(
        { _id: plan._id, "rsvps.userId": me },
        { $set: { "rsvps.$.status": status } }
    );
    if (changed.matchedCount === 0) {
        await Plan.updateOne(
            { _id: plan._id, "rsvps.userId": { $ne: me } },
            { $push: { rsvps: { userId: me, status } } }
        );
    }

    const fresh = await Plan.findById(plan._id);
    emitPlan(fresh);
    res.status(200).json(fresh);
});

/*
 * POST /api/plans/:planId/vote
 * Body: { optionId }   Toggles the caller's vote on one time option.
 */
export const vote = handle("vote", async (req, res) => {
    const { optionId } = req.body;
    if (!mongoose.isValidObjectId(optionId)) return res.status(400).json({ message: "Invalid optionId" });

    const { plan } = await planForMember(req, res);
    if (!plan) return;
    if (plan.status !== "open") return res.status(400).json({ message: "This plan was cancelled" });

    const option = plan.timeOptions.id(optionId);
    if (!option) return res.status(404).json({ message: "Time option not found" });

    // Atomic toggle: concurrent votes from different members must all land.
    const voted = option.votes.some((v) => v.equals(req.user._id));
    await Plan.updateOne(
        { _id: plan._id },
        { [voted ? "$pull" : "$addToSet"]: { "timeOptions.$[opt].votes": req.user._id } },
        { arrayFilters: [{ "opt._id": option._id }] }
    );

    const fresh = await Plan.findById(plan._id);
    emitPlan(fresh);
    res.status(200).json(fresh);
});

/*
 * PATCH /api/plans/:planId
 * Body: any of { title, where, whenText, startsAt, pickOptionId, status }
 * Any member can fill in details (plans are collaborative). pickOptionId
 * locks in a time from the poll. Cancelling is limited to the creator and
 * group admins, except for AI suggestions, which any member can dismiss.
 */
export const updatePlan = handle("updatePlan", async (req, res) => {
    const { plan, group } = await planForMember(req, res);
    if (!plan) return;

    const { title, where, whenText, startsAt, pickOptionId, status } = req.body;

    if (status !== undefined) {
        if (!["open", "cancelled"].includes(status)) {
            return res.status(400).json({ message: "status must be open or cancelled" });
        }
        const canCancel =
            plan.source === "ai" ||
            plan.createdBy?.equals(req.user._id) ||
            group.hasAdmin(req.user._id);
        if (!canCancel) {
            return res.status(403).json({ message: "Only the plan's creator or a group admin can do that" });
        }
        plan.status = status;
    }

    if (title !== undefined) {
        const t = clean(title, 100);
        if (!t) return res.status(400).json({ message: "A plan needs a title" });
        plan.title = t;
    }
    if (where !== undefined) plan.where = clean(where, 120) ?? "";
    if (whenText !== undefined) plan.whenText = clean(whenText, 80) ?? "";
    if (startsAt !== undefined) {
        const d = parseDate(startsAt);
        if (d === "invalid") return res.status(400).json({ message: "Invalid startsAt" });
        plan.startsAt = d ?? undefined;
    }
    if (pickOptionId !== undefined) {
        const option = mongoose.isValidObjectId(pickOptionId) && plan.timeOptions.id(pickOptionId);
        if (!option) return res.status(404).json({ message: "Time option not found" });
        plan.whenText = option.label;
        plan.startsAt = option.startsAt;
    }

    await plan.save();
    emitPlan(plan);
    res.status(200).json(plan);
});
