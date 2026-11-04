/*
 * Games people already play together online. Chit-Chat doesn't host them:
 * a plan points at one, and the group opens it in a new tab (with a call
 * running next to it). `code` games need a room code from whoever hosts.
 * Anything not listed can be added with a custom link.
 */
export const CATALOG = [
    { key: "skribbl", name: "skribbl.io", kind: "Draw and guess", url: "https://skribbl.io", note: "Make a private room and share its link." },
    { key: "gartic", name: "Gartic Phone", kind: "Draw and guess", url: "https://garticphone.com", note: "Create a room and share the link." },
    { key: "codenames", name: "Codenames", kind: "Word teams", url: "https://codenames.game", note: "Create a room and share the link." },
    { key: "amongus", name: "Among Us", kind: "Hidden roles", url: "", code: true, note: "Host a private game in the app and share the room code." },
    { key: "jackbox", name: "Jackbox Games", kind: "Party packs", url: "https://jackbox.tv", code: true, note: "The host starts a pack; everyone joins at jackbox.tv with the room code." },
    { key: "typeracer", name: "TypeRacer", kind: "Typing race", url: "https://play.typeracer.com", note: "Start a private race and share the link." },
    { key: "lichess", name: "Lichess", kind: "Chess", url: "https://lichess.org", note: "Challenge a friend and share the link." },
    { key: "cardgames", name: "CardGames.io", kind: "Cards", url: "https://cardgames.io", note: "Pick a card game and create a private table." },
    { key: "playingcards", name: "playingcards.io", kind: "Cards and boards", url: "https://playingcards.io", note: "Create a room and share the link." },
    { key: "geoguessr", name: "GeoGuessr", kind: "Geography", url: "https://www.geoguessr.com", note: "Start a party game and share the invite link." },
];

/** Only https links, so a plan can't carry a javascript: or http: URL. */
export function cleanHttpsUrl(value, max = 300) {
    if (value === undefined) return undefined;
    if (value === null || value === "") return "";
    if (typeof value !== "string" || value.length > max) return "invalid";
    try {
        const url = new URL(value.trim());
        return url.protocol === "https:" ? url.toString() : "invalid";
    } catch {
        return "invalid";
    }
}
