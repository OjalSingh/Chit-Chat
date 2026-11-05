import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as connect } from "socket.io-client";
import { server } from "../src/lib/socket.js";
import { signupUser } from "./helpers.js";

let url;
const clients = [];

beforeAll(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  clients.forEach((c) => c.disconnect());
  await new Promise((resolve) => server.close(resolve));
});

function open(cookie) {
  const client = connect(url, { extraHeaders: cookie ? { cookie } : {}, reconnection: false });
  clients.push(client);
  return client;
}

const once = (client, event) => new Promise((resolve) => client.once(event, resolve));

describe("Socket.IO realtime layer", () => {
  it("rejects a connection without a valid cookie", async () => {
    const client = open();
    const err = await once(client, "connect_error");
    expect(err.message).toMatch(/Unauthorized/);
  });

  it("broadcasts presence and pushes new messages to the online receiver", async () => {
    const alice = await signupUser();
    const bob = await signupUser();

    const bobSocket = open(bob.cookie);
    const online = await once(bobSocket, "getOnlineUsers");
    expect(online).toContain(bob.user._id);

    const incoming = once(bobSocket, "newMessage");
    await alice.agent.post(`/api/messages/send/${bob.user._id}`).send({ text: "live!" }).expect(201);
    const message = await incoming;
    expect(message).toMatchObject({ text: "live!", senderId: alice.user._id });
  });
});

describe("group realtime events", () => {
  it("delivers group messages to other online members but not the sender or outsiders", async () => {
    const { ownerWithFriends, createGroupAndJoin } = await import("./helpers.js");
    const { owner, friends } = await ownerWithFriends(1);
    const outsider = await signupUser();

    const created = { body: await createGroupAndJoin(owner, friends, "live") };
    const groupId = created.body._id;

    // Connect after the group exists: the server joins rooms on connect.
    const memberSocket = open(friends[0].cookie);
    const ownerSocket = open(owner.cookie);
    const outsiderSocket = open(outsider.cookie);
    await Promise.all([
      once(memberSocket, "groupsJoined"),
      once(ownerSocket, "groupsJoined"),
      once(outsiderSocket, "groupsJoined"),
    ]);

    const leaked = [];
    ownerSocket.on("newGroupMessage", (m) => leaked.push(["owner", m]));
    outsiderSocket.on("newGroupMessage", (m) => leaked.push(["outsider", m]));

    const incoming = once(memberSocket, "newGroupMessage");
    await owner.agent.post(`/api/groups/${groupId}/messages`).send({ text: "hello group" }).expect(201);
    const message = await incoming;
    expect(message).toMatchObject({ text: "hello group", groupId });
    expect(message.senderId.username).toBe(owner.user.username);

    await new Promise((r) => setTimeout(r, 100));
    expect(leaked).toEqual([]);
  });

  it("tells an online friend about an invite, and subscribes them once they accept", async () => {
    const { ownerWithFriends, createGroupAndJoin } = await import("./helpers.js");
    const { owner, friends } = await ownerWithFriends(1);

    const friendSocket = open(friends[0].cookie);
    await once(friendSocket, "groupsJoined");

    const invited = once(friendSocket, "groupInvite");
    const created = await owner.agent
      .post("/api/groups")
      .send({ name: "instant", memberIds: [friends[0].user._id] })
      .expect(201);
    expect(await invited).toMatchObject({ _id: created.body._id, name: "instant" });

    await friends[0].agent.post(`/api/groups/${created.body._id}/accept`).expect(200);

    const incoming = once(friendSocket, "newGroupMessage");
    await owner.agent.post(`/api/groups/${created.body._id}/messages`).send({ text: "first!" }).expect(201);
    expect((await incoming).text).toBe("first!");
  });
});

describe("plan realtime events", () => {
  it("pushes new plans and RSVP updates to every member", async () => {
    const { ownerWithFriends, createGroupAndJoin } = await import("./helpers.js");
    const { owner, friends } = await ownerWithFriends(1);
    const group = await createGroupAndJoin(owner, friends, "p");

    const memberSocket = open(friends[0].cookie);
    await once(memberSocket, "groupsJoined");

    const created = once(memberSocket, "plan:new");
    const plan = (await owner.agent.post(`/api/groups/${group._id}/plans`).send({ title: "Chai run" })).body;
    expect((await created)._id).toBe(plan._id);

    const updated = once(memberSocket, "plan:update");
    await owner.agent.patch(`/api/plans/${plan._id}`).send({ where: "Gate 2" }).expect(200);
    expect((await updated).where).toBe("Gate 2");
  });
});

describe("typing pings", () => {
  it("reach a friend or fellow room member, and nobody else", async () => {
    const { ownerWithFriends, createGroupAndJoin } = await import("./helpers.js");
    const { owner, friends } = await ownerWithFriends(2);
    const outsider = await signupUser();
    const group = await createGroupAndJoin(owner, friends, "typing");

    const ownerSocket = open(owner.cookie);
    const friendSocket = open(friends[0].cookie);
    const otherFriendSocket = open(friends[1].cookie);
    const outsiderSocket = open(outsider.cookie);
    await Promise.all([ownerSocket, friendSocket, otherFriendSocket, outsiderSocket].map((s) => once(s, "groupsJoined")));

    // room typing: the other members see it, the typist and outsiders don't
    const seen = [];
    ownerSocket.on("typing", () => seen.push("owner"));
    outsiderSocket.on("typing", () => seen.push("outsider"));
    const heard = once(friendSocket, "typing");
    ownerSocket.emit("typing", { groupId: group._id });
    expect(await heard).toMatchObject({ userId: owner.user._id, username: owner.user.username, groupId: group._id });

    // direct typing: only the friend being typed to
    await new Promise((r) => setTimeout(r, 1100)); // the one-a-second limit
    const dm = once(friendSocket, "typing");
    ownerSocket.emit("typing", { to: friends[0].user._id });
    expect(await dm).toMatchObject({ userId: owner.user._id });

    // a stranger can't ping someone they aren't friends with
    await new Promise((r) => setTimeout(r, 1100));
    outsiderSocket.emit("typing", { to: friends[1].user._id });
    outsiderSocket.emit("typing", { groupId: group._id });
    await new Promise((r) => setTimeout(r, 150));
    expect(seen).toEqual([]);
    const leaked = [];
    otherFriendSocket.on("typing", () => leaked.push("x"));
    await new Promise((r) => setTimeout(r, 100));
    expect(leaked).toEqual([]);
  });
});
