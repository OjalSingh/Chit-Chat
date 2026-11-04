import { describe, expect, it } from "vitest";
import { ownerWithFriends, signupUser } from "./helpers.js";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function makeGroup(n = 2) {
  const { owner, friends } = await ownerWithFriends(n);
  const group = (
    await owner.agent.post("/api/groups").send({ name: "Weekend crew", memberIds: friends.map((f) => f.user._id) })
  ).body;
  return { owner, friends, group };
}

describe("game on a plan", () => {
  it("catalog lists link games", async () => {
    const u = await signupUser();
    const res = await u.agent.get("/api/games/catalog").expect(200);
    const names = res.body.map((g) => g.name);
    expect(names).toContain("skribbl.io");
    expect(res.body.every((g) => !g.url || g.url.startsWith("https://"))).toBe(true);
  });

  it("stores a game with a link and/or a room code, validates, and clears", async () => {
    const { owner, group } = await makeGroup(1);
    const created = await owner.agent
      .post(`/api/groups/${group._id}/plans`)
      .send({ title: "Game night", game: { name: "skribbl.io", url: "https://skribbl.io/?abc" } })
      .expect(201);
    expect(created.body.game).toMatchObject({ name: "skribbl.io", url: "https://skribbl.io/?abc" });

    const code = await owner.agent
      .patch(`/api/plans/${created.body._id}`)
      .send({ game: { name: "Among Us", code: "ABCDEF" } })
      .expect(200);
    expect(code.body.game).toMatchObject({ name: "Among Us", code: "ABCDEF" });
    expect(code.body.game.url).toBeUndefined();

    for (const bad of [{ url: "https://x.io" }, { name: "x", url: "http://x.io" }, { name: "x", url: "javascript:1" }, "skribbl"]) {
      await owner.agent.patch(`/api/plans/${created.body._id}`).send({ game: bad }).expect(400);
    }
    const cleared = await owner.agent.patch(`/api/plans/${created.body._id}`).send({ game: null }).expect(200);
    expect(cleared.body.game?.name).toBeUndefined();
  });
});

describe("game sessions", () => {
  it("logs a session, marks the plan done, and keeps it for members only", async () => {
    const { owner, friends, group } = await makeGroup(2);
    const [a, b] = friends;
    const plan = (
      await owner.agent.post(`/api/groups/${group._id}/plans`).send({ title: "Game night", game: { name: "skribbl.io" } })
    ).body;

    const res = await owner.agent
      .post(`/api/groups/${group._id}/sessions`)
      .send({
        gameName: "skribbl.io",
        playerIds: [owner.user._id, a.user._id],
        winnerId: a.user._id,
        note: "Close one",
        screenshot: PNG,
        planId: plan._id,
      })
      .expect(201);
    expect(res.body).toMatchObject({ gameName: "skribbl.io", winnerId: a.user._id, note: "Close one", hasScreenshot: true });
    expect(res.body.screenshot).toBeUndefined();

    // plan leaves the open list
    const open = await owner.agent.get(`/api/groups/${group._id}/plans`).expect(200);
    expect(open.body).toEqual([]);

    // screenshot served as an image, to members only
    const img = await b.agent.get(`/api/sessions/${res.body._id}/screenshot`).expect(200);
    expect(img.headers["content-type"]).toMatch(/image\/png/);
    expect(img.headers["x-content-type-options"]).toBe("nosniff");
    const outsider = await signupUser();
    await outsider.agent.get(`/api/sessions/${res.body._id}/screenshot`).expect(403);
    await outsider.agent.get(`/api/groups/${group._id}/sessions`).expect(403);
    await outsider.agent.post(`/api/groups/${group._id}/sessions`).send({ gameName: "x", playerIds: [owner.user._id] }).expect(403);
  });

  it("validates input", async () => {
    const { owner, friends, group } = await makeGroup(1);
    const outsider = await signupUser();
    const post = (body) => owner.agent.post(`/api/groups/${group._id}/sessions`).send(body);
    const me = owner.user._id;
    await post({ playerIds: [me] }).expect(400); // no game
    await post({ gameName: "x", playerIds: [] }).expect(400); // nobody played
    await post({ gameName: "x", playerIds: [outsider.user._id] }).expect(400); // not a member
    await post({ gameName: "x", playerIds: [me], winnerId: friends[0].user._id }).expect(400); // winner not a player
    await post({ gameName: "x", playerIds: [me], playedAt: "later" }).expect(400);
    await post({ gameName: "x", playerIds: [me], screenshot: "data:image/svg+xml;base64,PHN2Zy8+" }).expect(400);
    await post({ gameName: "x", playerIds: [me], screenshot: "data:text/html;base64,PGI+" }).expect(400);
    await post({ gameName: "x", playerIds: [me], screenshot: "data:image/png;base64," + "A".repeat(1_000_001) }).expect(400);
    await post({ gameName: "x", playerIds: [me], planId: "000000000000000000000000" }).expect(404);
    await post({ gameName: "x", playerIds: [me] }).expect(201);
  });

  it("computes who played, wins and which games, newest first", async () => {
    const { owner, friends, group } = await makeGroup(2);
    const [a, b] = friends;
    const log = (body) => owner.agent.post(`/api/groups/${group._id}/sessions`).send(body).expect(201);
    await log({ gameName: "skribbl.io", playerIds: [owner.user._id, a.user._id, b.user._id], winnerId: a.user._id, playedAt: "2026-11-01T18:00:00Z" });
    await log({ gameName: "skribbl.io", playerIds: [owner.user._id, a.user._id], winnerId: a.user._id, playedAt: "2026-11-02T18:00:00Z" });
    await log({ gameName: "Codenames", playerIds: [owner.user._id], winnerId: owner.user._id, playedAt: "2026-11-03T18:00:00Z" });

    const res = await b.agent.get(`/api/groups/${group._id}/sessions`).expect(200);
    expect(res.body.sessions.map((s) => s.gameName)).toEqual(["Codenames", "skribbl.io", "skribbl.io"]);
    expect(res.body.sessions.every((s) => s.screenshot === undefined)).toBe(true);
    expect(res.body.stats.total).toBe(3);
    expect(res.body.stats.games.map((g) => [g.name, g.count])).toEqual([["skribbl.io", 2], ["Codenames", 1]]);
    const row = (id) => res.body.stats.players.find((p) => p.userId === id);
    expect(row(owner.user._id)).toMatchObject({ played: 3, wins: 1 });
    expect(row(a.user._id)).toMatchObject({ played: 2, wins: 2 });
    expect(row(b.user._id)).toMatchObject({ played: 1, wins: 0 });
    expect(res.body.stats.players[0].userId).toBe(owner.user._id); // most played first
  });

  it("lets the logger or an admin delete a session, not other members", async () => {
    const { owner, friends, group } = await makeGroup(2);
    const [a, b] = friends;
    const make = async (who) =>
      (await who.agent.post(`/api/groups/${group._id}/sessions`).send({ gameName: "x", playerIds: [who.user._id] }).expect(201)).body;
    const s1 = await make(a);
    await b.agent.delete(`/api/sessions/${s1._id}`).expect(403);
    await owner.agent.delete(`/api/sessions/${s1._id}`).expect(200); // owner is the group admin
    const s2 = await make(a);
    await a.agent.delete(`/api/sessions/${s2._id}`).expect(200);
    await a.agent.delete(`/api/sessions/${s2._id}`).expect(404);
  });
});
