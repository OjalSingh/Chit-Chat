import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ownerWithFriends, signupUser } from "./helpers.js";

vi.mock("../src/services/planExtractor.js", () => ({ extractPlan: vi.fn() }));
const { extractPlan } = await import("../src/services/planExtractor.js");
const { __resetDetector } = await import("../src/services/planDetector.js");
const { ENV } = await import("../src/lib/env.js");

async function makeGroup(n = 2) {
  const { owner, friends } = await ownerWithFriends(n);
  const res = await owner.agent
    .post("/api/groups")
    .send({ name: "Hostel B", memberIds: friends.map((f) => f.user._id) })
    .expect(201);
  return { owner, friends, group: res.body };
}

const say = (member, groupId, text) =>
  member.agent.post(`/api/groups/${groupId}/messages`).send({ text }).expect(201);

describe("member-created plans", () => {
  it("creates a plan with the creator going, visible to members only", async () => {
    const { owner, friends, group } = await makeGroup(1);
    const res = await owner.agent
      .post(`/api/groups/${group._id}/plans`)
      .send({ title: "Dinner", where: "Food court", timeOptions: ["7pm", "8pm"] })
      .expect(201);
    expect(res.body).toMatchObject({ title: "Dinner", where: "Food court", source: "member", status: "open" });
    expect(res.body.rsvps).toEqual([{ userId: owner.user._id, status: "going" }]);
    expect(res.body.timeOptions.map((o) => o.label)).toEqual(["7pm", "8pm"]);

    const list = await friends[0].agent.get(`/api/groups/${group._id}/plans`).expect(200);
    expect(list.body.map((p) => p._id)).toEqual([res.body._id]);

    const outsider = await signupUser();
    await outsider.agent.get(`/api/groups/${group._id}/plans`).expect(403);
    await outsider.agent.post(`/api/plans/${res.body._id}/rsvp`).send({ status: "going" }).expect(403);
  });

  it("validates input", async () => {
    const { owner, group } = await makeGroup(1);
    await owner.agent.post(`/api/groups/${group._id}/plans`).send({}).expect(400);
    await owner.agent.post(`/api/groups/${group._id}/plans`).send({ title: "x", startsAt: "soon" }).expect(400);
    await owner.agent
      .post(`/api/groups/${group._id}/plans`)
      .send({ title: "x", timeOptions: ["1", "2", "3", "4", "5", "6"] })
      .expect(400);
    await owner.agent.post("/api/plans/nope/rsvp").send({ status: "going" }).expect(400);
  });
});

describe("RSVPs and time polls", () => {
  it("records one RSVP per member and lets them change it", async () => {
    const { owner, friends, group } = await makeGroup(1);
    const plan = (await owner.agent.post(`/api/groups/${group._id}/plans`).send({ title: "Trek" })).body;

    await friends[0].agent.post(`/api/plans/${plan._id}/rsvp`).send({ status: "maybe" }).expect(200);
    const res = await friends[0].agent.post(`/api/plans/${plan._id}/rsvp`).send({ status: "out" }).expect(200);
    expect(res.body.rsvps).toEqual([
      { userId: owner.user._id, status: "going" },
      { userId: friends[0].user._id, status: "out" },
    ]);
    await friends[0].agent.post(`/api/plans/${plan._id}/rsvp`).send({ status: "yes!" }).expect(400);
  });

  it("toggles votes and locks in a time", async () => {
    const { owner, friends, group } = await makeGroup(1);
    const plan = (
      await owner.agent.post(`/api/groups/${group._id}/plans`).send({ title: "Movie", timeOptions: ["Fri 9pm", "Sat 6pm"] })
    ).body;
    const [fri] = plan.timeOptions;

    let res = await friends[0].agent.post(`/api/plans/${plan._id}/vote`).send({ optionId: fri._id }).expect(200);
    expect(res.body.timeOptions[0].votes).toEqual([friends[0].user._id]);
    res = await friends[0].agent.post(`/api/plans/${plan._id}/vote`).send({ optionId: fri._id }).expect(200);
    expect(res.body.timeOptions[0].votes).toEqual([]);

    res = await owner.agent.patch(`/api/plans/${plan._id}`).send({ pickOptionId: fri._id }).expect(200);
    expect(res.body.whenText).toBe("Fri 9pm");
  });
});

describe("concurrent taps", () => {
  it("keeps every RSVP and vote when members act at the same moment", async () => {
    const { owner, friends, group } = await makeGroup(5);
    const plan = (
      await owner.agent.post(`/api/groups/${group._id}/plans`).send({ title: "Fest", timeOptions: ["Fri", "Sat"] })
    ).body;
    const sat = plan.timeOptions[1]._id;

    await Promise.all(
      friends.flatMap((f) => [
        f.agent.post(`/api/plans/${plan._id}/rsvp`).send({ status: "going" }).expect(200),
        f.agent.post(`/api/plans/${plan._id}/vote`).send({ optionId: sat }).expect(200),
      ])
    );

    const [fresh] = (await owner.agent.get(`/api/groups/${group._id}/plans`)).body;
    expect(fresh.rsvps.filter((r) => r.status === "going")).toHaveLength(6);
    expect(fresh.timeOptions[1].votes).toHaveLength(5);
  });
});

describe("editing and cancelling", () => {
  it("lets any member fill in details", async () => {
    const { owner, friends, group } = await makeGroup(1);
    const plan = (await owner.agent.post(`/api/groups/${group._id}/plans`).send({ title: "Trek" })).body;
    const res = await friends[0].agent
      .patch(`/api/plans/${plan._id}`)
      .send({ where: "Main gate", whenText: "Sat 6am", startsAt: "2026-11-07T06:00:00+05:30" })
      .expect(200);
    expect(res.body).toMatchObject({ where: "Main gate", whenText: "Sat 6am" });
  });

  it("limits cancelling a member's plan to its creator and admins", async () => {
    const { owner, friends, group } = await makeGroup(2);
    const plan = (await friends[0].agent.post(`/api/groups/${group._id}/plans`).send({ title: "Gym" })).body;
    await friends[1].agent.patch(`/api/plans/${plan._id}`).send({ status: "cancelled" }).expect(403);
    await owner.agent.patch(`/api/plans/${plan._id}`).send({ status: "cancelled" }).expect(200);

    const list = await owner.agent.get(`/api/groups/${group._id}/plans`).expect(200);
    expect(list.body).toEqual([]);
    await friends[1].agent.post(`/api/plans/${plan._id}/rsvp`).send({ status: "going" }).expect(400);
  });
});

describe("AI plan detection", () => {
  const saved = {};
  beforeEach(() => {
    saved.key = process.env.ANTHROPIC_API_KEY;
    saved.debounce = ENV.PLAN_DEBOUNCE_MS;
    process.env.ANTHROPIC_API_KEY = "test-key";
    ENV.PLAN_DEBOUNCE_MS = 30;
    extractPlan.mockReset();
  });
  afterEach(() => {
    if (saved.key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved.key;
    ENV.PLAN_DEBOUNCE_MS = saved.debounce;
    __resetDetector();
  });

  const found = { title: "Saturday trek", where: "Yelagiri", whenText: "Sat 7am", startsAt: undefined, timeOptions: [], confidence: 0.9 };

  it("creates an AI card on demand from the recent chat", async () => {
    const { owner, friends, group } = await makeGroup(1);
    await say(owner, group._id, "trek saturday?");
    await say(friends[0], group._id, "yes 7am");
    extractPlan.mockResolvedValue(found);

    const res = await owner.agent.post(`/api/groups/${group._id}/plans/detect`).expect(200);
    expect(res.body.plan).toMatchObject({ title: "Saturday trek", source: "ai", status: "open" });
    expect(res.body.plan.sourceMessageIds).toHaveLength(2);

    const input = extractPlan.mock.calls[0][0];
    expect(input.messages.map((m) => [m.senderName, m.text])).toEqual([
      [owner.user.username, "trek saturday?"],
      [friends[0].user.username, "yes 7am"],
    ]);
  });

  it("passes open plans to the model and never duplicates a card", async () => {
    const { owner, friends, group } = await makeGroup(1);
    await say(owner, group._id, "trek saturday?");
    await say(friends[0], group._id, "yes");
    extractPlan.mockResolvedValue(found);

    await owner.agent.post(`/api/groups/${group._id}/plans/detect`).expect(200);
    const again = await owner.agent.post(`/api/groups/${group._id}/plans/detect`).expect(200);
    expect(again.body.plan).toBeNull();
    expect(extractPlan.mock.calls[1][0].openPlans.map((p) => p.title)).toEqual(["Saturday trek"]);
  });

  it("returns no card when nothing is being planned", async () => {
    const { owner, friends, group } = await makeGroup(1);
    await say(owner, group._id, "lol");
    await say(friends[0], group._id, "ikr");
    extractPlan.mockResolvedValue(null);
    const res = await owner.agent.post(`/api/groups/${group._id}/plans/detect`).expect(200);
    expect(res.body.plan).toBeNull();
  });

  it("runs once after the chat goes quiet, not once per message", async () => {
    const { owner, friends, group } = await makeGroup(1);
    extractPlan.mockResolvedValue(found);
    await say(owner, group._id, "trek saturday?");
    await say(friends[0], group._id, "in");
    await say(owner, group._id, "7am main gate");

    await vi.waitFor(() => expect(extractPlan).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await new Promise((r) => setTimeout(r, 100));
    expect(extractPlan).toHaveBeenCalledTimes(1);
    await vi.waitFor(async () => {
      const list = await owner.agent.get(`/api/groups/${group._id}/plans`).expect(200);
      expect(list.body.map((p) => p.title)).toEqual(["Saturday trek"]);
    });
  });

  it("lets any member dismiss an AI suggestion", async () => {
    const { owner, friends, group } = await makeGroup(2);
    await say(owner, group._id, "trek?");
    await say(friends[0], group._id, "maybe");
    extractPlan.mockResolvedValue(found);
    const { plan } = (await owner.agent.post(`/api/groups/${group._id}/plans/detect`)).body;
    await friends[1].agent.patch(`/api/plans/${plan._id}`).send({ status: "cancelled" }).expect(200);
  });

  it("is off without credentials", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { owner, friends, group } = await makeGroup(1);
    await say(owner, group._id, "trek?");
    await say(friends[0], group._id, "sure");
    await owner.agent.post(`/api/groups/${group._id}/plans/detect`).expect(503);
    await new Promise((r) => setTimeout(r, 100));
    expect(extractPlan).not.toHaveBeenCalled();
  });
});
