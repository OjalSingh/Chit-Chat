import { useCallback, useEffect, useRef, useState } from "react";
import { getWordleToday, guessWordle, getWordleStats, getWordleLeaderboard } from "../api/games";
import { socket } from "../api/socket";

const ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["enter", "z", "x", "c", "v", "b", "n", "m", "back"],
];

const EMOJI = { g: "🟩", y: "🟨", x: "⬛" };

/* Best mark seen for each letter, for colouring the keyboard. */
function keyStates(guesses) {
    const rank = { x: 1, y: 2, g: 3 };
    const out = {};
    for (const { word, marks } of guesses) {
        [...word].forEach((letter, i) => {
            if (!out[letter] || rank[marks[i]] > rank[out[letter]]) out[letter] = marks[i];
        });
    }
    return out;
}

function MiniGrid({ grid }) {
    return (
        <div className="mini-grid" aria-label="Guess colours">
            {grid.map((marks, r) => (
                <div key={r}>
                    {[...marks].map((m, c) => (
                        <i key={c} className={`m ${m}`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

function Board({ state, typed, shake }) {
    const rows = [];
    for (let r = 0; r < state.maxGuesses; r += 1) {
        const guess = state.guesses[r];
        const isCurrent = r === state.guesses.length && !state.finished;
        const letters = guess ? guess.word : isCurrent ? typed : "";
        rows.push(
            <div key={r} className={`wrow${isCurrent && shake ? " shake" : ""}`}>
                {Array.from({ length: 5 }, (_, c) => (
                    <div
                        key={c}
                        className={`tile ${guess ? guess.marks[c] : letters[c] ? "typed" : ""}`}
                        style={guess ? { animationDelay: `${c * 90}ms` } : undefined}
                    >
                        {letters[c]?.toUpperCase()}
                    </div>
                ))}
            </div>
        );
    }
    return <div className="board" role="img" aria-label="Word of the day board">{rows}</div>;
}

function Stats({ stats }) {
    if (!stats) return null;
    const max = Math.max(1, ...stats.distribution);
    return (
        <div className="stats">
            <div className="stat-row">
                <div><b>{stats.played}</b><small>played</small></div>
                <div><b>{stats.winRate}%</b><small>wins</small></div>
                <div><b>{stats.currentStreak}</b><small>streak</small></div>
                <div><b>{stats.bestStreak}</b><small>best</small></div>
                <div><b>{stats.averageGuesses ?? "-"}</b><small>avg tries</small></div>
            </div>
            <div className="dist">
                {stats.distribution.map((n, i) => (
                    <div key={i} className="dist-row">
                        <span>{i + 1}</span>
                        <div className="bar" style={{ width: `${Math.max(8, (n / max) * 100)}%` }}>{n}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Compare({ groups, currentUser, refreshKey }) {
    const [groupId, setGroupId] = useState(groups[0]?._id ?? "");
    const [board, setBoard] = useState(null);
    const [error, setError] = useState("");

    // Rooms can load after this mounts, or the picked one can be left.
    useEffect(() => {
        if (!groups.some((g) => g._id === groupId)) setGroupId(groups[0]?._id ?? "");
    }, [groups, groupId]);

    const load = useCallback(async () => {
        if (!groupId) return;
        try {
            setError("");
            setBoard(await getWordleLeaderboard(groupId));
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load the leaderboard.");
        }
    }, [groupId]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    // A crew member finished: refresh live.
    useEffect(() => {
        const onResult = (event) => {
            if (event.groupId === groupId) load();
        };
        socket.on("game:result", onResult);
        return () => socket.off("game:result", onResult);
    }, [groupId, load]);

    if (groups.length === 0) {
        return <p className="muted">Make a room with your crew to compare scores.</p>;
    }

    const todayText = (row) => {
        const t = row.today;
        if (t.status === "won") return `solved in ${t.attempts}`;
        if (t.status === "lost") return "missed it";
        if (t.status === "playing") return `${t.guessesUsed} tries so far`;
        return "not yet";
    };

    return (
        <div style={{ display: "grid", gap: "10px" }}>
            <div className="search-row">
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Room">
                    {groups.map((g) => (
                        <option key={g._id} value={g._id}>
                            {g.name}
                        </option>
                    ))}
                </select>
            </div>
            {error && <p className="error">{error}</p>}
            {board && (
                <>
                    {!board.iFinishedToday && (
                        <small>Finish today's word to peek at everyone's colours.</small>
                    )}
                    <div className="lb">
                        {board.rows.map((row, i) => (
                            <div key={row.userId} className={row.userId === currentUser?._id ? "lb-row me" : "lb-row"}>
                                <span className="rank">{i + 1}</span>
                                <div className="who-col">
                                    <b>{row.username}</b>
                                    <small>
                                        {row.stats.played === 0
                                            ? "no games yet"
                                            : `${row.stats.averageGuesses ?? "-"} avg · ${row.stats.winRate}% wins · ${row.stats.currentStreak} day streak`}
                                    </small>
                                    <small>Today: {todayText(row)}</small>
                                </div>
                                {row.today.grid && <MiniGrid grid={row.today.grid} />}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function WordleGame({ groups, currentUser }) {
    const [state, setState] = useState(null);
    const [typed, setTyped] = useState("");
    const [message, setMessage] = useState("");
    const [shake, setShake] = useState(false);
    const [stats, setStats] = useState(null);
    const [version, setVersion] = useState(0);
    const [copied, setCopied] = useState(false);
    const busy = useRef(false);

    useEffect(() => {
        getWordleToday().then(setState).catch(() => setMessage("Couldn't load today's word."));
        getWordleStats().then(setStats).catch(() => {});
    }, []);

    const complain = (text) => {
        setMessage(text);
        setShake(true);
        setTimeout(() => setShake(false), 400);
    };

    const submit = useCallback(async () => {
        if (!state || state.finished || busy.current) return;
        if (typed.length < 5) return complain("Not enough letters");
        busy.current = true;
        try {
            const next = await guessWordle(typed);
            setState(next);
            setTyped("");
            setMessage("");
            if (next.finished) {
                getWordleStats().then(setStats).catch(() => {});
                setVersion((v) => v + 1);
            }
        } catch (err) {
            complain(err.response?.data?.message || "Something went wrong");
        } finally {
            busy.current = false;
        }
    }, [state, typed]);

    const press = useCallback(
        (key) => {
            if (!state || state.finished) return;
            if (key === "enter") submit();
            else if (key === "back") setTyped((t) => t.slice(0, -1));
            else if (/^[a-z]$/.test(key)) setTyped((t) => (t.length < 5 ? t + key : t));
        },
        [state, submit]
    );

    // Physical keyboard, unless the player is typing in another field.
    useEffect(() => {
        const onKey = (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
            const k = e.key.toLowerCase();
            if (k === "enter") press("enter");
            else if (k === "backspace") press("back");
            else if (/^[a-z]$/.test(k)) press(k);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [press]);

    if (!state) return <div className="scroll"><p className="muted" style={{ margin: "auto" }}>{message || "Loading..."}</p></div>;

    const states = keyStates(state.guesses);
    const shareText = `Word of the day ${state.dayKey} ${state.status === "won" ? state.attempts : "X"}/${state.maxGuesses}\n${state.guesses
        .map((g) => [...g.marks].map((m) => EMOJI[m]).join(""))
        .join("\n")}`;

    const share = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setMessage("Couldn't copy. Select the text instead.");
        }
    };

    return (
        <>
            <div className="convo-head">
                <div>
                    <h2>Word of the day</h2>
                    <small>Five letters, six tries. Same word for everyone today.</small>
                </div>
            </div>
            <div className="scroll game-scroll">
                <div className="game-cols">
                    <div className="game-play">
                        <Board state={state} typed={typed} shake={shake} />
                        <p className="game-msg" role="status">
                            {state.status === "won" && `Nice! Solved in ${state.attempts}.`}
                            {state.status === "lost" && `Out of tries. It was ${state.answer?.toUpperCase()}.`}
                            {!state.finished && message}
                        </p>
                        {state.finished ? (
                            <div className="finish">
                                <pre className="share">{shareText}</pre>
                                <button className="pink" onClick={share}>{copied ? "Copied" : "Copy to share"}</button>
                                <small>A new word arrives tomorrow.</small>
                            </div>
                        ) : (
                            <div className="keyboard">
                                {ROWS.map((row, i) => (
                                    <div key={i} className="krow">
                                        {row.map((k) => (
                                            <button
                                                key={k}
                                                className={`key ${states[k] ?? ""} ${k.length > 1 ? "wide" : ""}`}
                                                onClick={() => press(k)}
                                                aria-label={k === "back" ? "Backspace" : k === "enter" ? "Enter" : k}
                                            >
                                                {k === "back" ? "⌫" : k === "enter" ? "Enter" : k}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="game-side">
                        <h3>Your record</h3>
                        <Stats stats={stats} />
                        <h3>Your crew</h3>
                        <Compare groups={groups} currentUser={currentUser} refreshKey={version} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default WordleGame;
