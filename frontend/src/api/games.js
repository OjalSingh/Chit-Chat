import client from "./client";

export const getGames = async () => (await client.get("/games")).data;

export const getWordleToday = async () => (await client.get("/games/wordle/today")).data;

export const guessWordle = async (guess) => (await client.post("/games/wordle/guess", { guess })).data;

export const getWordleStats = async () => (await client.get("/games/wordle/stats")).data;

export const getWordleLeaderboard = async (groupId) =>
    (await client.get(`/games/wordle/leaderboard/${groupId}`)).data;
