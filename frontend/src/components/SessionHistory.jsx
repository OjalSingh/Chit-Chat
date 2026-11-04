import { useCallback, useEffect, useState } from "react";
import { getSessions, deleteSession, screenshotUrl } from "../api/sessions";
import { socket } from "../api/socket";
import Avatar from "./Avatar";
import SessionForm from "./SessionForm";

const when = (iso) =>
    new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/*
 * A room's game history: who plays most, which games, what's next, and
 * every session with its scoreboard screenshot.
 */
function SessionHistory({ group, plans, currentUser, onBack }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [logging, setLogging] = useState(false);

    const nameOf = (id) => group.members.find((m) => m._id === id)?.username ?? "someone";

    const load = useCallback(async () => {
        try {
            setError("");
            setData(await getSessions(group._id));
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't load the history.");
        }
    }, [group._id]);

    useEffect(() => {
        load();
    }, [load]);

    // Someone logged or removed a session: refresh.
    useEffect(() => {
        const refresh = (e) => e.groupId === group._id && load();
        socket.on("session:new", refresh);
        socket.on("session:removed", refresh);
        return () => {
            socket.off("session:new", refresh);
            socket.off("session:removed", refresh);
        };
    }, [group._id, load]);

    const remove = async (id) => {
        try {
            await deleteSession(id);
            load();
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't delete that.");
        }
    };

    // The next plan on the calendar, or the first open one without a time.
    const upcoming = [...plans]
        .filter((p) => p.status === "open")
        .sort((a, b) => (a.startsAt ? new Date(a.startsAt) : Infinity) - (b.startsAt ? new Date(b.startsAt) : Infinity))[0];

    const maxPlayed = Math.max(1, ...(data?.stats.players.map((p) => p.played) ?? [1]));

    return (
        <>
            <div className="convo-head">
                <div>
                    <h2>{group.name}: game history</h2>
                    <small>Who played what, and when.</small>
                </div>
                <div className="tools">
                    <button className="small lime" onClick={() => setLogging(true)}>+ Log a game</button>
                    <button className="small plain" onClick={onBack}>Back to chat</button>
                </div>
            </div>

            {logging && (
                <SessionForm
                    group={group}
                    currentUser={currentUser}
                    onCancel={() => setLogging(false)}
                    onDone={() => {
                        setLogging(false);
                        load();
                    }}
                />
            )}

            <div className="scroll">
                {error && <p className="error">{error}</p>}

                {upcoming && (
                    <div className="next-up">
                        <b>Next up</b>
                        <span>
                            {upcoming.title}
                            {upcoming.game?.name && ` (${upcoming.game.name})`}
                            {upcoming.whenText ? `, ${upcoming.whenText}` : upcoming.startsAt ? `, ${new Date(upcoming.startsAt).toLocaleString()}` : ""}
                        </span>
                    </div>
                )}

                {data && data.stats.total === 0 && (
                    <div className="empty">
                        <h3>No games logged yet</h3>
                        <p className="muted">After you play, press "We played" on the plan, or "Log a game" here. Add a screenshot of the scoreboard to keep it.</p>
                    </div>
                )}

                {data && data.stats.total > 0 && (
                    <>
                        <div className="hist-stats">
                            <div>
                                <h3>Who plays</h3>
                                {data.stats.players.map((p) => (
                                    <div key={p.userId} className="dist-row">
                                        <span className="nm">{p.username}</span>
                                        <div className="bar" style={{ width: `${Math.max(12, (p.played / maxPlayed) * 100)}%` }}>
                                            {p.played}
                                        </div>
                                        {p.wins > 0 && <small>{p.wins} won</small>}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <h3>What you play</h3>
                                {data.stats.games.map((g) => (
                                    <div key={g.name} className="game-line">
                                        <b>{g.name}</b>
                                        <small>
                                            {g.count} time{g.count === 1 ? "" : "s"}, last {when(g.lastPlayedAt)}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <h3>Sessions</h3>
                        <div className="sessions">
                            {data.sessions.map((s) => (
                                <div key={s._id} className="session">
                                    {s.hasScreenshot && (
                                        <a href={screenshotUrl(s._id)} target="_blank" rel="noopener noreferrer" title="Open the screenshot">
                                            <img
                                                className="thumb"
                                                src={screenshotUrl(s._id)}
                                                crossOrigin="use-credentials"
                                                alt={`Scoreboard from ${s.gameName}`}
                                                loading="lazy"
                                            />
                                        </a>
                                    )}
                                    <div className="session-body">
                                        <b>{s.gameName}</b>
                                        <small>{when(s.playedAt)}</small>
                                        <div className="avatars">
                                            {s.players.map((id) => (
                                                <span key={id} title={nameOf(id)}>
                                                    <Avatar name={nameOf(id)} />
                                                </span>
                                            ))}
                                        </div>
                                        <span>
                                            {s.players.map(nameOf).join(", ")}
                                            {s.winnerId && <b className="winner"> · {nameOf(s.winnerId)} won</b>}
                                        </span>
                                        {s.note && <small>"{s.note}"</small>}
                                    </div>
                                    {(s.createdBy === currentUser?._id || group.admins?.includes(currentUser?._id)) && (
                                        <button className="small plain" onClick={() => remove(s._id)}>
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default SessionHistory;
