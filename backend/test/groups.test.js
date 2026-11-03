import { describe, expect, it } from "vitest";
import { ownerWithFriends, signupUser } from "./helpers.js";

async function makeGroup(n = 2, name = "Trek club") {
  const { owner, friends } = await ownerWithFriends(n);
  const res = await owner.agent
    .post("/api/groups")
    .send({ name, memberIds: friends.map((f) => f.user._id) })
    .expect(201);
  return { owner, friends, group: res.body };
}

describe("creating groups", () => {
  it("creates a group with the creator as admin and member", async () => {
    const { owner, friends, group } = await makeGroup(2);
    expect(group.name).toBe("Trek club");
    expect(group.admins).toEqual([owner.user._id]);
    expect(group.members.map((m) => m._id).sort()).toEqual(
      [owner.user._id, ...friends.map((f) => f.user._id)].sort()
    );
    expect(group.members[0].password).toBeUndefined();
  });

  it("only lets you add friends", async () => {
    const { owner } = await ownerWithFriends(0);
    const stranger = await signupUser();
    const res = await owner.agent
      .post("/api/groups")
      .send({ name: "x", memberIds: [stranger.user._id] })
      .expect(400);
    expect(res.body.message).toMatch(/friends/);
  });

  it.each([
    [{ memberIds: [] }, /name/],
    [{ name: "   ", memberIds: ["000000000000000000000000"] }, /name/],
    [{ name: "x".repeat(61), memberIds: ["000000000000000000000000"] }, /60/],
    [{ name: "x" }, /at least one/],
    [{ name: "x", memberIds: ["nope"] }, /Invalid/],
  ])("validates input %#", async (body, message) => {
    const { owner } = await ownerWithFriends(0);
    const res = await owner.agent.post("/api/groups").send(body).expect(400);
    expect(res.body.message).toMatch(message);
  });

  it("ignores duplicates and the creator's own id in memberIds", async () => {
    const { owner, friends } = await ownerWithFriends(1);
    const id = friends[0].user._id;
    const res = await owner.agent
      .post("/api/groups")
      .send({ name: "dupes", memberIds: [id, id, owner.user._id] })
      .expect(201);
    expect(res.body.members).toHaveLength(2);
  });
});

describe("reading groups", () => {
  it("lists only the groups you are in", async () => {
    const { friends, group } = await makeGroup(1);
    const outsider = await signupUser();

    const mine = await friends[0].agent.get("/api/groups").expect(200);
    expect(mine.body.map((g) => g._id)).toEqual([group._id]);

    const theirs = await outsider.agent.get("/api/groups").expect(200);
    expect(theirs.body).toEqual([]);
  });

  it("hides group details and messages from non-members", async () => {
    const { group } = await makeGroup(1);
    const outsider = await signupUser();
    await outsider.agent.get(`/api/groups/${group._id}`).expect(403);
    await outsider.agent.get(`/api/groups/${group._id}/messages`).expect(403);
    await outsider.agent.post(`/api/groups/${group._id}/messages`).send({ text: "hi" }).expect(403);
  });

  it("returns 404 for an unknown group and 400 for a malformed id", async () => {
    const user = await signupUser();
    await user.agent.get("/api/groups/000000000000000000000000").expect(404);
    await user.agent.get("/api/groups/nope").expect(400);
  });
});

describe("group messages", () => {
  it("lets every member post and read, in order, with sender names", async () => {
    const { owner, friends, group } = await makeGroup(2);
    await owner.agent.post(`/api/groups/${group._id}/messages`).send({ text: "Trek Saturday?" }).expect(201);
    await friends[0].agent.post(`/api/groups/${group._id}/messages`).send({ text: "I'm in" }).expect(201);

    const res = await friends[1].agent.get(`/api/groups/${group._id}/messages`).expect(200);
    expect(res.body.map((m) => [m.senderId.username, m.text])).toEqual([
      [owner.user.username, "Trek Saturday?"],
      [friends[0].user.username, "I'm in"],
    ]);
  });

  it("rejects empty messages", async () => {
    const { owner, group } = await makeGroup(1);
    await owner.agent.post(`/api/groups/${group._id}/messages`).send({}).expect(400);
  });

  it("keeps group messages out of direct-message views", async () => {
    const { owner, friends, group } = await makeGroup(1);
    await owner.agent.post(`/api/groups/${group._id}/messages`).send({ text: "group only" }).expect(201);

    const chats = await owner.agent.get("/api/messages/chats").expect(200);
    expect(chats.body).toEqual([]);
    const dm = await owner.agent.get(`/api/messages/${friends[0].user._id}`).expect(200);
    expect(dm.body).toEqual([]);
  });
});

describe("managing members", () => {
  it("lets an admin add their friends", async () => {
    const { owner, friends } = await ownerWithFriends(2);
    const created = await owner.agent
      .post("/api/groups")
      .send({ name: "g", memberIds: [friends[0].user._id] })
      .expect(201);

    const res = await owner.agent
      .post(`/api/groups/${created.body._id}/members`)
      .send({ memberIds: [friends[1].user._id] })
      .expect(200);
    expect(res.body.members).toHaveLength(3);
  });

  it("stops non-admins from adding or removing others", async () => {
    const { owner, friends, group } = await makeGroup(2);
    await friends[0].agent
      .post(`/api/groups/${group._id}/members`)
      .send({ memberIds: [owner.user._id] })
      .expect(403);
    await friends[0].agent.delete(`/api/groups/${group._id}/members/${friends[1].user._id}`).expect(403);
    await friends[0].agent.patch(`/api/groups/${group._id}`).send({ name: "mine now" }).expect(403);
  });

  it("lets an admin remove a member, who then loses access", async () => {
    const { owner, friends, group } = await makeGroup(2);
    await owner.agent.delete(`/api/groups/${group._id}/members/${friends[0].user._id}`).expect(200);
    await friends[0].agent.get(`/api/groups/${group._id}/messages`).expect(403);
  });

  it("lets anyone leave, and promotes a new admin when the last one leaves", async () => {
    const { owner, friends, group } = await makeGroup(2);
    const res = await owner.agent.delete(`/api/groups/${group._id}/members/${owner.user._id}`).expect(200);
    expect(res.body.admins).toHaveLength(1);
    expect(res.body.admins[0]).not.toBe(owner.user._id);
    expect(res.body.members.map((m) => m._id)).not.toContain(owner.user._id);
    await friends[0].agent.get(`/api/groups/${group._id}`).expect(200);
  });

  it("deletes the group and its messages when the last member leaves", async () => {
    const { owner, friends, group } = await makeGroup(1);
    await owner.agent.post(`/api/groups/${group._id}/messages`).send({ text: "bye" }).expect(201);
    await owner.agent.delete(`/api/groups/${group._id}/members/${owner.user._id}`).expect(200);
    const last = await friends[0].agent.delete(`/api/groups/${group._id}/members/${friends[0].user._id}`).expect(200);
    expect(last.body.message).toBe("Group deleted");
    await friends[0].agent.get(`/api/groups/${group._id}`).expect(404);
  });

  it("lets an admin rename the group", async () => {
    const { owner, group } = await makeGroup(1);
    const res = await owner.agent.patch(`/api/groups/${group._id}`).send({ name: "Hostel B" }).expect(200);
    expect(res.body.name).toBe("Hostel B");
  });
});
