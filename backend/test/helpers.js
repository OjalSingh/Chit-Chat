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
