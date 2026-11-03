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
    const { ownerWithFriends } = await import("./helpers.js");
    const { owner, friends } = await ownerWithFriends(1);
    const outsider = await signupUser();

    const created = await owner.agent
      .post("/api/groups")
      .send({ name: "live", memberIds: [friends[0].user._id] })
      .expect(201);
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

  it("subscribes an online friend to a new group immediately", async () => {
    const { ownerWithFriends } = await import("./helpers.js");
    const { owner, friends } = await ownerWithFriends(1);

    const friendSocket = open(friends[0].cookie);
    await once(friendSocket, "groupsJoined");

    const added = once(friendSocket, "groupAdded");
    const created = await owner.agent
      .post("/api/groups")
      .send({ name: "instant", memberIds: [friends[0].user._id] })
      .expect(201);
    expect((await added)._id).toBe(created.body._id);

    const incoming = once(friendSocket, "newGroupMessage");
    await owner.agent.post(`/api/groups/${created.body._id}/messages`).send({ text: "first!" }).expect(201);
    expect((await incoming).text).toBe("first!");
  });
});
