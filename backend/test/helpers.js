import request from "supertest";
import app from "../src/app.js";

let counter = 0;

/** Signs up a fresh user and returns an agent that carries their auth cookie. */
export async function signupUser(overrides = {}) {
  counter += 1;
  const body = {
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    password: "secret123",
    ...overrides,
  };
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/signup").send(body).expect(201);
  const cookie = res.headers["set-cookie"].find((c) => c.startsWith("jwt="));
  return { agent, user: res.body, cookie: cookie.split(";")[0], password: body.password };
}

export { app, request };

/** Makes two users friends through the real request/accept endpoints. */
export async function befriend(a, b) {
  const sent = await a.agent.post(`/api/friends/request/${b.user._id}`).expect(201);
  await b.agent.patch(`/api/friends/accept/${sent.body.request._id}`).expect(200);
}

/** Signs up an owner plus `n` friends of the owner. */
export async function ownerWithFriends(n) {
  const owner = await signupUser();
  const friends = [];
  for (let i = 0; i < n; i += 1) {
    const f = await signupUser();
    await befriend(owner, f);
    friends.push(f);
  }
  return { owner, friends };
}

/** Creates a group and has every friend accept the invite, like real members would. */
export async function createGroupAndJoin(owner, friends, name = "Crew") {
  const created = await owner.agent
    .post("/api/groups")
    .send({ name, memberIds: friends.map((f) => f.user._id) })
    .expect(201);
  for (const f of friends) await f.agent.post(`/api/groups/${created.body._id}/accept`).expect(200);
  return (await owner.agent.get(`/api/groups/${created.body._id}`).expect(200)).body;
}
