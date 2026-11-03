import { describe, expect, it } from "vitest";
import { signupUser } from "./helpers.js";

describe("messages API", () => {
  it("sends a message and both sides can read the conversation", async () => {
    const alice = await signupUser();
    const bob = await signupUser();

    const sent = await alice.agent
      .post(`/api/messages/send/${bob.user._id}`)
      .send({ text: "hi bob" })
      .expect(201);
    expect(sent.body).toMatchObject({ text: "hi bob", senderId: alice.user._id, receiverId: bob.user._id });

    await bob.agent.post(`/api/messages/send/${alice.user._id}`).send({ text: "hey alice" }).expect(201);

    const thread = await bob.agent.get(`/api/messages/${alice.user._id}`).expect(200);
    expect(thread.body.map((m) => m.text)).toEqual(["hi bob", "hey alice"]);
  });

  it("keeps conversations private to their two participants", async () => {
    const alice = await signupUser();
    const bob = await signupUser();
    const eve = await signupUser();
    await alice.agent.post(`/api/messages/send/${bob.user._id}`).send({ text: "secret" }).expect(201);

    const evesView = await eve.agent.get(`/api/messages/${bob.user._id}`).expect(200);
    expect(evesView.body).toEqual([]);
  });

  it("lists chat partners", async () => {
    const alice = await signupUser();
    const bob = await signupUser();
    const carol = await signupUser();
    await alice.agent.post(`/api/messages/send/${bob.user._id}`).send({ text: "1" }).expect(201);
    await carol.agent.post(`/api/messages/send/${alice.user._id}`).send({ text: "2" }).expect(201);

    const res = await alice.agent.get("/api/messages/chats").expect(200);
    expect(res.body.map((u) => u.username).sort()).toEqual([bob.user.username, carol.user.username].sort());
    expect(res.body.every((u) => u.password === undefined)).toBe(true);
  });

  it("rejects empty messages, self-messages and unknown recipients", async () => {
    const alice = await signupUser();
    const bob = await signupUser();
    await alice.agent.post(`/api/messages/send/${bob.user._id}`).send({}).expect(400);
    await alice.agent.post(`/api/messages/send/${alice.user._id}`).send({ text: "me" }).expect(400);
    await alice.agent.post("/api/messages/send/000000000000000000000000").send({ text: "?" }).expect(404);
  });

  it("returns 400, not 500, for a malformed user id", async () => {
    const alice = await signupUser();
    await alice.agent.get("/api/messages/not-an-id").expect(400);
    await alice.agent.post("/api/messages/send/not-an-id").send({ text: "x" }).expect(400);
  });

  it("requires authentication", async () => {
    const { request, app } = await import("./helpers.js");
    await request(app).get("/api/messages/chats").expect(401);
  });
});
