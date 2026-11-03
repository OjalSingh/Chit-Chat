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
