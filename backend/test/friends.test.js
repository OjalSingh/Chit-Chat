import { describe, expect, it } from "vitest";
import { signupUser } from "./helpers.js";

describe("friends API", () => {
  it("runs the full request, accept and list flow", async () => {
    const alice = await signupUser();
    const bob = await signupUser();

    const sent = await alice.agent.post(`/api/friends/request/${bob.user._id}`).expect(201);
    const requestId = sent.body.request._id;

    const inbox = await bob.agent.get("/api/friends/requests").expect(200);
    expect(inbox.body).toHaveLength(1);
    expect(inbox.body[0].sender.username).toBe(alice.user.username);

    // Only the receiver may accept.
    await alice.agent.patch(`/api/friends/accept/${requestId}`).expect(403);
    await bob.agent.patch(`/api/friends/accept/${requestId}`).expect(200);

    const alicesFriends = await alice.agent.get("/api/friends").expect(200);
    const bobsFriends = await bob.agent.get("/api/friends").expect(200);
    expect(alicesFriends.body.map((f) => f._id)).toEqual([bob.user._id]);
    expect(bobsFriends.body.map((f) => f._id)).toEqual([alice.user._id]);
  });

  it("blocks duplicate requests in either direction", async () => {
    const alice = await signupUser();
    const bob = await signupUser();
    await alice.agent.post(`/api/friends/request/${bob.user._id}`).expect(201);
    await alice.agent.post(`/api/friends/request/${bob.user._id}`).expect(400);
    await bob.agent.post(`/api/friends/request/${alice.user._id}`).expect(400);
  });

  it("lets the receiver reject, and the pair can try again later", async () => {
    const alice = await signupUser();
    const bob = await signupUser();
    const sent = await alice.agent.post(`/api/friends/request/${bob.user._id}`).expect(201);
    await bob.agent.patch(`/api/friends/reject/${sent.body.request._id}`).expect(200);
    await alice.agent.post(`/api/friends/request/${bob.user._id}`).expect(201);
  });

  it("refuses self-requests and malformed ids", async () => {
    const alice = await signupUser();
    await alice.agent.post(`/api/friends/request/${alice.user._id}`).expect(400);
    await alice.agent.post("/api/friends/request/nope").expect(400);
    await alice.agent.patch("/api/friends/accept/nope").expect(400);
  });

  it("searches by username, case-insensitively, excluding yourself", async () => {
    const alice = await signupUser({ username: "AliceSmith" });
    await signupUser({ username: "alicia" });
    await signupUser({ username: "bob" });

    const res = await alice.agent.get("/api/friends/search?username=ALIC").expect(200);
    expect(res.body.map((u) => u.username)).toEqual(["alicia"]);
    expect(res.body[0].password).toBeUndefined();
  });

  it("treats regex characters in a search as plain text", async () => {
    const alice = await signupUser();
    await signupUser({ username: "bob" });
    const wildcard = await alice.agent.get("/api/friends/search?username=.*").expect(200);
    expect(wildcard.body).toEqual([]);
    await alice.agent.get("/api/friends/search?username=(").expect(200);
  });
});
