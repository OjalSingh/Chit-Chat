import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { app, request, signupUser } from "./helpers.js";

describe("GET /api/health", () => {
  it("reports ok", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /api/auth/signup", () => {
  it("creates a user, sets an httpOnly cookie and never returns the password", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "alice", email: "alice@example.com", password: "secret123" })
      .expect(201);

    expect(res.body).toMatchObject({ username: "alice", email: "alice@example.com" });
    expect(res.body.password).toBeUndefined();
    const cookie = res.headers["set-cookie"].join(";");
    expect(cookie).toMatch(/jwt=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it.each([
    [{ email: "a@example.com", password: "secret123" }, /required/],
    [{ username: "a", email: "a@example.com", password: "123" }, /6 characters/],
    [{ username: "a", email: "not-an-email", password: "secret123" }, /valid email/],
  ])("rejects invalid input %#", async (body, message) => {
    const res = await request(app).post("/api/auth/signup").send(body).expect(400);
    expect(res.body.message).toMatch(message);
  });

  it("rejects a duplicate email", async () => {
    await signupUser({ username: "bob", email: "bob@example.com" });
    await request(app)
      .post("/api/auth/signup")
      .send({ username: "bob2", email: "bob@example.com", password: "secret123" })
      .expect(400);
  });

  it("rejects a duplicate username with 400, not a server error", async () => {
    await signupUser({ username: "carol", email: "carol@example.com" });
    await request(app)
      .post("/api/auth/signup")
      .send({ username: "carol", email: "carol2@example.com", password: "secret123" })
      .expect(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the right password", async () => {
    const { user, password } = await signupUser();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password })
      .expect(200);
    expect(res.body._id).toBe(user._id);
    expect(res.headers["set-cookie"].join(";")).toMatch(/jwt=/);
  });

  it("rejects a wrong password without saying which field was wrong", async () => {
    const { user } = await signupUser();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong-password" })
      .expect(400);
    expect(res.body.message).toBe("Invalid Credentials");
  });

  it("rejects an unknown email the same way", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "secret123" })
      .expect(400);
    expect(res.body.message).toBe("Invalid Credentials");
  });
});

describe("GET /api/auth/verify", () => {
  it("returns the current user for a valid cookie", async () => {
    const { agent, user } = await signupUser();
    const res = await agent.get("/api/auth/verify").expect(200);
    expect(res.body._id).toBe(user._id);
    expect(res.body.password).toBeUndefined();
  });

  it("returns 401 without a cookie", async () => {
    await request(app).get("/api/auth/verify").expect(401);
  });

  it("returns 401 for a tampered token", async () => {
    const forged = jwt.sign({ userId: "000000000000000000000000" }, "wrong-secret");
    await request(app).get("/api/auth/verify").set("Cookie", `jwt=${forged}`).expect(401);
  });

  it("returns 401 for an expired token", async () => {
    const { user } = await signupUser();
    const expired = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: -10 });
    await request(app).get("/api/auth/verify").set("Cookie", `jwt=${expired}`).expect(401);
  });

  it("clears the cookie on logout", async () => {
    const { agent } = await signupUser();
    const res = await agent.post("/api/auth/logout").expect(200);
    expect(res.headers["set-cookie"].join(";")).toMatch(/jwt=;/);
  });
});

describe("login cookie attributes", () => {
  const withSameSite = async (value, fn) => {
    const before = process.env.COOKIE_SAMESITE;
    if (value === undefined) delete process.env.COOKIE_SAMESITE;
    else process.env.COOKIE_SAMESITE = value;
    try {
      await fn();
    } finally {
      if (before === undefined) delete process.env.COOKIE_SAMESITE;
      else process.env.COOKIE_SAMESITE = before;
    }
  };

  it("is SameSite=Strict by default", async () => {
    await withSameSite(undefined, async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ username: "strict", email: "strict@example.com", password: "secret123" })
        .expect(201);
      expect(res.headers["set-cookie"].find((c) => c.startsWith("jwt="))).toMatch(/SameSite=Strict/i);
    });
  });

  it("supports cross-site deploys: SameSite=None is Secure, and logout clears with the same attributes", async () => {
    await withSameSite("none", async () => {
      const agent = request.agent(app);
      const signup = await agent
        .post("/api/auth/signup")
        .send({ username: "xsite", email: "xsite@example.com", password: "secret123" })
        .expect(201);
      const set = signup.headers["set-cookie"].find((c) => c.startsWith("jwt="));
      expect(set).toMatch(/SameSite=None/i);
      expect(set).toMatch(/Secure/i);
      expect(set).toMatch(/HttpOnly/i);

      const out = await agent.post("/api/auth/logout").expect(200);
      const cleared = out.headers["set-cookie"].find((c) => c.startsWith("jwt="));
      expect(cleared).toMatch(/SameSite=None/i);
      expect(cleared).toMatch(/Secure/i);
    });
  });

  it("falls back to Strict for an unknown value", async () => {
    await withSameSite("bogus", async () => {
      const agent = request.agent(app);
      const res = await agent
        .post("/api/auth/signup")
        .send({ username: "bogus", email: "bogus@example.com", password: "secret123" })
        .expect(201);
      expect(res.headers["set-cookie"].find((c) => c.startsWith("jwt="))).toMatch(/SameSite=Strict/i);
    });
  });
});
