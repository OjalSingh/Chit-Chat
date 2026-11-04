import { createHash } from "node:crypto";
import { ANSWERS } from "./data/answers.js";
import { VALID_GUESSES } from "./data/valid.js";
import { ENV } from "../lib/env.js";

/*
 * Pure Wordle rules, kept free of Express and Mongo so they are easy to test.
 * Everyone gets the same word on the same day, so scores are comparable
 * across groups.
 */

export const MAX_GUESSES = 6;
export const WORD_LENGTH = 5;

/** "2026-11-04" in the game's timezone. */
export function dayKeyFor(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: ENV.GAME_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

/** Day before a "YYYY-MM-DD" key (UTC arithmetic on the calendar date). */
export function previousDayKey(key) {
    const d = new Date(`${key}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

/*
 * The word of the day. Hashed with a server-side salt so the schedule can't
 * be read off the word list order.
 */
export function answerFor(key) {
    const salt = process.env.GAME_SALT || process.env.JWT_SECRET || "chit-chat";
    const digest = createHash("sha256").update(`${salt}:wordle:${key}`).digest();
    return ANSWERS[digest.readUInt32BE(0) % ANSWERS.length];
}

export const isValidGuess = (word) =>
    typeof word === "string" && word.length === WORD_LENGTH && VALID_GUESSES.has(word);

/**
 * Scores a guess against the answer. One mark per letter:
 * "g" right letter, right place; "y" right letter, wrong place; "x" not in
 * the word (or already used up by duplicates).
 */
export function evaluate(guess, answer) {
    const marks = Array(WORD_LENGTH).fill("x");
    const left = {};
    for (let i = 0; i < WORD_LENGTH; i += 1) {
        if (guess[i] === answer[i]) marks[i] = "g";
        else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
    }
    for (let i = 0; i < WORD_LENGTH; i += 1) {
        if (marks[i] === "g") continue;
        if (left[guess[i]] > 0) {
            marks[i] = "y";
            left[guess[i]] -= 1;
        }
    }
    return marks.join("");
}

/**
 * Stats from a player's finished results (any order), as of `today`.
 * A streak counts consecutive days with a win, and stays alive through
 * today if today hasn't been played yet.
 */
export function computeStats(results, today = dayKeyFor()) {
    const finished = results.filter((r) => r.status === "won" || r.status === "lost");
    const won = finished.filter((r) => r.status === "won");
    const distribution = Array(MAX_GUESSES).fill(0);
    for (const r of won) distribution[r.attempts - 1] += 1;

    const wonDays = new Set(won.map((r) => r.dayKey));
    let current = 0;
    let cursor = wonDays.has(today) ? today : previousDayKey(today);
    while (wonDays.has(cursor)) {
        current += 1;
        cursor = previousDayKey(cursor);
    }

    let best = 0;
    let run = 0;
    let prev = null;
    for (const day of [...wonDays].sort()) {
        run = prev && previousDayKey(day) === prev ? run + 1 : 1;
        best = Math.max(best, run);
        prev = day;
    }

    return {
        played: finished.length,
        won: won.length,
        winRate: finished.length ? Math.round((won.length / finished.length) * 100) : 0,
        averageGuesses: won.length ? Math.round((won.reduce((s, r) => s + r.attempts, 0) / won.length) * 100) / 100 : null,
        currentStreak: current,
        bestStreak: best,
        distribution,
    };
}
