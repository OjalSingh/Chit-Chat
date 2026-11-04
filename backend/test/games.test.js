import { describe, expect, it } from "vitest";
import { createGroupAndJoin, ownerWithFriends, signupUser } from "./helpers.js";
import { ANSWERS } from "../src/games/data/answers.js";
import {
  answerFor,
  computeStats,
  dayKeyFor,
  evaluate,
  isValidGuess,
  previousDayKey,
} from "../src/games/wordle.js";

describe("wordle rules", () => {
  it("marks letters in place, out of place and absent", () => {
    expect(evaluate("crane", "crane")).toBe("ggggg");
    expect(evaluate("slate", "crane")).toBe("xxgxg");
  });

  it("scores repeated letters one for one", () => {
    expect(evaluate("geese", "crane")).toBe("xxxxg"); // only the exact e counts
    expect(evaluate("speed", "abide")).toBe("xxyxy"); // one e in the answer, one yellow
    expect(evaluate("hello", "world")).toBe("xxxgy"); // green l uses up the only l
    expect(evaluate("allay", "label")).toBe("yyyxx"); // two l's, one a
  });

  it("validates guesses and picks a stable word for each day", () => {
    expect(isValidGuess("crane")).toBe(true);
    expect(isValidGuess("zzzzz")).toBe(false);
    expect(isValidGuess("cat")).toBe(false);
    expect(isValidGuess(12345)).toBe(false);
    expect(answerFor("2026-11-04")).toBe(answerFor("2026-11-04"));
    expect(ANSWERS).toContain(answerFor("2026-11-04"));
    const words = new Set(
      Array.from({ length: 30 }, (_, i) => answerFor(`2026-12-${String(i + 1).padStart(2, "0")}`))
    );
    expect(words.size).toBeGreaterThan(20);
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
    expect(previousDayKey("2027-01-01")).toBe("2026-12-31");
  });
});

describe("wordle stats", () => {
  const won = (dayKey, attempts) => ({ dayKey, status: "won", attempts });
  const lost = (dayKey) => ({ dayKey, status: "lost", attempts: 0 });

  it("counts wins, averages, distribution and streaks", () => {
    const stats = computeStats(
      [won("2026-11-01", 3), won("2026-11-02", 4), lost("2026-11-03"), won("2026-11-04", 3), won("2026-11-05", 2)],
      "2026-11-05"
    );
    expect(stats).toMatchObject({
      played: 5,
      won: 4,
      winRate: 80,
      averageGuesses: 3,
      currentStreak: 2,
      bestStreak: 2,
    });
    expect(stats.distribution).toEqual([0, 1, 2, 1, 0, 0]);
  });

  it("keeps a streak alive through a day not yet played, but not a missed day", () => {
    const results = [won("2026-11-02", 3), won("2026-11-03", 3)];
    expect(computeStats(results, "2026-11-04").currentStreak).toBe(2); // today not played yet
    expect(computeStats(results, "2026-11-05").currentStreak).toBe(0); // missed the 4th
    expect(computeStats(results, "2026-11-05").bestStreak).toBe(2);
  });

  it("handles no games", () => {
    expect(computeStats([], "2026-11-05")).toMatchObject({ played: 0, averageGuesses: null, winRate: 0 });
  });
});

const wrongWords = (answer, n) =>
  ["about", "crane", "slate", "tiger", "ghost", "plumb", "knoll", "brisk"].filter((w) => w !== answer).slice(0, n);

describe("wordle API", () => {
  const today = () => answerFor(dayKeyFor());

  it("needs a login and lists the game", async () => {
    const anon = await signupUser();
    const list = await anon.agent.get("/api/games").expect(200);
    expect(list.body.map((g) => g.key)).toEqual(["wordle"]);
  });

  it("scores guesses on the server, hides the answer, and records a win", async () => {
    const me = await signupUser();
    let state = (await me.agent.get("/api/games/wordle/today").expect(200)).body;
    expect(state).toMatchObject({ status: "new", guesses: [] });
    expect(state.answer).toBeUndefined();

    const [first] = wrongWords(today(), 1);
    state = (await me.agent.post("/api/games/wordle/guess").send({ guess: first }).expect(200)).body;
    expect(state.status).toBe("playing");
    expect(state.guesses).toHaveLength(1);
    expect(state.guesses[0].marks).toBe(evaluate(first, today()));
    expect(state.answer).toBeUndefined();

    state = (await me.agent.post("/api/games/wordle/guess").send({ guess: today() }).expect(200)).body;
    expect(state).toMatchObject({ status: "won", attempts: 2, finished: true });

    // a finished game takes no more guesses
    await me.agent.post("/api/games/wordle/guess").send({ guess: first }).expect(400);

    const stats = (await me.agent.get("/api/games/wordle/stats").expect(200)).body;
    expect(stats).toMatchObject({ played: 1, won: 1, currentStreak: 1, averageGuesses: 2 });
  });

  it("rejects non-words, repeats, and a seventh guess; reveals the answer after a loss", async () => {
    const me = await signupUser();
    await me.agent.post("/api/games/wordle/guess").send({ guess: "zzzzz" }).expect(400);
    await me.agent.post("/api/games/wordle/guess").send({}).expect(400);

    const six = wrongWords(today(), 6);
    await me.agent.post("/api/games/wordle/guess").send({ guess: six[0] }).expect(200);
    await me.agent.post("/api/games/wordle/guess").send({ guess: six[0] }).expect(400); // repeat
    let state;
    for (const w of six.slice(1)) {
      state = (await me.agent.post("/api/games/wordle/guess").send({ guess: w }).expect(200)).body;
    }
    expect(state).toMatchObject({ status: "lost", answer: today(), finished: true });
    await me.agent.post("/api/games/wordle/guess").send({ guess: today() }).expect(400);
  });

  it("never lets concurrent guesses go past six or duplicate", async () => {
    const me = await signupUser();
    const six = wrongWords(today(), 6);
    const words = [...six, ...six]; // 12 requests at once
    await Promise.all(words.map((w) => me.agent.post("/api/games/wordle/guess").send({ guess: w })));
    const state = (await me.agent.get("/api/games/wordle/today")).body;
    expect(state.guesses.length).toBeLessThanOrEqual(6);
    expect(new Set(state.guesses.map((g) => g.word)).size).toBe(state.guesses.length);
  });

  it("ranks a group and shows others' grids only to people who have finished", async () => {
    const { owner, friends } = await ownerWithFriends(2);
    const group = await createGroupAndJoin(owner, friends);
    const [a, b] = friends;

    // owner wins in 2, a wins in 1, b has not played
    const [wrong] = wrongWords(today(), 1);
    await owner.agent.post("/api/games/wordle/guess").send({ guess: wrong });
    await a.agent.post("/api/games/wordle/guess").send({ guess: today() }).expect(200);

    // b hasn't finished, so no one's grid is visible to b, and b's own row is "new"
    let board = (await b.agent.get(`/api/games/wordle/leaderboard/${group._id}`).expect(200)).body;
    expect(board.iFinishedToday).toBe(false);
    expect(board.rows.every((r) => r.today.grid === null)).toBe(true);
    expect(board.rows.find((r) => r.userId === b.user._id).today.status).toBe("new");
    // words are never in the payload
    expect(JSON.stringify(board)).not.toContain(today());

    // owner finishes: now owner sees a's grid
    await owner.agent.post("/api/games/wordle/guess").send({ guess: today() }).expect(200);
    board = (await owner.agent.get(`/api/games/wordle/leaderboard/${group._id}`).expect(200)).body;
    expect(board.iFinishedToday).toBe(true);
    const rowA = board.rows.find((r) => r.userId === a.user._id);
    expect(rowA.today).toMatchObject({ status: "won", attempts: 1, grid: ["ggggg"] });
    // best average first: a (1) before owner (2) before b (never won)
    expect(board.rows.map((r) => r.userId)).toEqual([a.user._id, owner.user._id, b.user._id]);
  });

  it("keeps non-members out of a group's board", async () => {
    const { owner, friends } = await ownerWithFriends(1);
    const group = await createGroupAndJoin(owner, friends);
    const outsider = await signupUser();
    await outsider.agent.get(`/api/games/wordle/leaderboard/${group._id}`).expect(403);
    await outsider.agent.get("/api/games/wordle/leaderboard/nope").expect(400);
  });
});
