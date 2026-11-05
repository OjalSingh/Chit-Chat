import { useCallback, useEffect, useRef, useState } from "react";
import { postFlapScore, getFlapLeaderboard } from "../api/games";
import { play } from "../lib/sound";

const W = 360;
const H = 520;
const GROUND = 56;
const BIRD = { x: 90, size: 26 };
const GRAVITY = 1500;
const FLAP = -430;
const SPEED = 120;
const GAP = 138;
const PIPE_W = 58;
const EVERY = 1.55; // seconds between pipes

const bestKey = "flapBest";
const readBest = () => {
    try {
        return Number(localStorage.getItem(bestKey)) || 0;
    } catch {
        return 0;
    }
};

/* Draws a pixel bird (original) at x, y, tilted by its speed. */
function drawBird(ctx, x, y, vy, flapFrame) {
    ctx.save();
    ctx.translate(x + BIRD.size / 2, y + BIRD.size / 2);
    ctx.rotate(Math.max(-0.5, Math.min(1.1, vy / 700)));
    const u = BIRD.size / 8;
    const px = (cx, cy, w, h, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(-BIRD.size / 2 + cx * u, -BIRD.size / 2 + cy * u, w * u, h * u);
    };
    px(1, 1, 6, 6, "#2b2b2b");
    px(2, 1, 4, 6, "#f8d838");
    px(1, 2, 6, 4, "#f8d838");
    px(5, 2, 2, 2, "#fff");
    px(6, 2.5, 1, 1, "#2b2b2b");
    px(6, 4, 3, 1.5, "#e8481c");
    px(1.5, flapFrame ? 3 : 4.2, 3, 1.6, "#fff");
    ctx.restore();
}

function drawPipe(ctx, x, top, bottomY) {
    const body = (y, h) => {
        ctx.fillStyle = "#2b4a12";
        ctx.fillRect(x - 2, y, PIPE_W + 4, h);
        ctx.fillStyle = "#73bf2e";
        ctx.fillRect(x, y, PIPE_W, h);
        ctx.fillStyle = "#9be34a";
        ctx.fillRect(x + 6, y, 10, h);
        ctx.fillStyle = "#4f8a1c";
        ctx.fillRect(x + PIPE_W - 12, y, 10, h);
    };
    body(0, top);
    body(bottomY, H - GROUND - bottomY);
    // caps
    for (const y of [top - 22, bottomY]) {
        ctx.fillStyle = "#2b4a12";
        ctx.fillRect(x - 6, y, PIPE_W + 12, 22);
        ctx.fillStyle = "#73bf2e";
        ctx.fillRect(x - 4, y + 2, PIPE_W + 8, 18);
        ctx.fillStyle = "#9be34a";
        ctx.fillRect(x, y + 2, 10, 18);
    }
}

/*
 * Tap to flap: a small canvas game in the spirit of one-tap arcade games.
 * Original art, no assets. Your best is kept in this browser and on the
 * server so your room can compare. The score you finish with is sent once,
 * when you crash.
 */
function FlapGame({ groups, currentUser }) {
    const canvas = useRef(null);
    const game = useRef(null);
    const [phase, setPhase] = useState("ready"); // ready | playing | over
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(readBest);
    const [note, setNote] = useState("");
    const [boardKey, setBoardKey] = useState(0);

    const reset = useCallback(() => {
        game.current = { y: H / 2 - 40, vy: 0, pipes: [], t: 0, since: EVERY - 0.6, score: 0, scroll: 0, frame: 0 };
        setScore(0);
        setPhase("ready");
        setNote("");
    }, []);

    useEffect(() => reset(), [reset]);

    const flap = useCallback(() => {
        const g = game.current;
        if (!g) return;
        if (phase === "over") return;
        if (phase === "ready") setPhase("playing");
        g.vy = FLAP;
        play("flap");
    }, [phase]);

    // Keyboard.
    useEffect(() => {
        const onKey = (e) => {
            if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
            if (e.code === "Space" || e.code === "ArrowUp") {
                e.preventDefault();
                flap();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [flap]);

    const finish = useCallback(async (finalScore) => {
        setPhase("over");
        setBest((prev) => {
            const next = Math.max(prev, finalScore);
            try {
                localStorage.setItem(bestKey, String(next));
            } catch {
                /* ignore */
            }
            return next;
        });
        if (finalScore > 0) {
            try {
                const res = await postFlapScore(finalScore);
                setBest((prev) => Math.max(prev, res.best));
                setNote(res.newBest ? "New best! Your crew can see it." : "");
                setBoardKey((k) => k + 1);
            } catch {
                setNote("Couldn't save the score online.");
            }
        }
    }, []);

    // The loop.
    useEffect(() => {
        const el = canvas.current;
        if (!el) return undefined;
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        el.width = W * ratio;
        el.height = H * ratio;
        const ctx = el.getContext("2d");
        ctx.scale(ratio, ratio);
        ctx.imageSmoothingEnabled = false;
        let raf;
        let last = performance.now();

        const draw = (g, running) => {
            // sky
            const sky = ctx.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, "#4ec0ca");
            sky.addColorStop(1, "#a8ece4");
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#ffffffcc";
            for (const [cx, cy, cw] of [[40, 90, 70], [220, 60, 90], [300, 160, 50], [120, 200, 60]]) {
                const x = ((cx - g.scroll * 0.2) % (W + 100) + W + 100) % (W + 100) - 50;
                ctx.fillRect(x, cy, cw, 16);
                ctx.fillRect(x + 8, cy - 10, cw - 22, 12);
            }
            for (const p of g.pipes) drawPipe(ctx, p.x, p.gapY - GAP / 2, p.gapY + GAP / 2);
            // ground
            ctx.fillStyle = "#ded895";
            ctx.fillRect(0, H - GROUND, W, GROUND);
            ctx.fillStyle = "#73bf2e";
            ctx.fillRect(0, H - GROUND, W, 12);
            ctx.fillStyle = "#9be34a";
            for (let x = -((g.scroll * 1) % 24); x < W; x += 24) ctx.fillRect(x, H - GROUND, 12, 12);
            ctx.fillStyle = "#2b2b2b";
            ctx.fillRect(0, H - GROUND - 3, W, 3);
            drawBird(ctx, BIRD.x, g.y, g.vy, running && g.frame % 2 === 0);
            if (running || g.score > 0) {
                ctx.font = '22px "Press Start 2P", monospace';
                ctx.textAlign = "center";
                ctx.lineWidth = 6;
                ctx.strokeStyle = "#2b2b2b";
                ctx.strokeText(String(g.score), W / 2, 70);
                ctx.fillStyle = "#fff";
                ctx.fillText(String(g.score), W / 2, 70);
            }
        };

        const tick = (now) => {
            const dt = Math.min(0.033, (now - last) / 1000);
            last = now;
            const g = game.current;
            if (g) {
                const running = g.phase === "playing";
                if (running) {
                    g.t += dt;
                    g.frame = Math.floor(g.t * 8);
                    g.vy += GRAVITY * dt;
                    g.y += g.vy * dt;
                    g.scroll += SPEED * dt;
                    g.since += dt;
                    if (g.since >= EVERY) {
                        g.since = 0;
                        g.pipes.push({ x: W + 10, gapY: 130 + Math.random() * (H - GROUND - 260), scored: false });
                    }
                    for (const p of g.pipes) p.x -= SPEED * dt;
                    g.pipes = g.pipes.filter((p) => p.x > -PIPE_W - 12);
                    // scoring and collisions
                    let dead = g.y < -10 || g.y + BIRD.size > H - GROUND;
                    for (const p of g.pipes) {
                        if (!p.scored && p.x + PIPE_W < BIRD.x) {
                            p.scored = true;
                            g.score += 1;
                            play("point");
                            setScore(g.score);
                        }
                        const inX = BIRD.x + BIRD.size - 4 > p.x && BIRD.x + 4 < p.x + PIPE_W;
                        const inGap = g.y + 4 > p.gapY - GAP / 2 && g.y + BIRD.size - 4 < p.gapY + GAP / 2;
                        if (inX && !inGap) dead = true;
                    }
                    if (dead) {
                        g.phase = "over";
                        play("hit");
                        g.y = Math.min(g.y, H - GROUND - BIRD.size);
                        finish(g.score);
                    }
                } else if (g.phase === "ready") {
                    g.t += dt;
                    g.y = H / 2 - 40 + Math.sin(g.t * 4) * 6;
                    g.scroll += SPEED * 0.3 * dt;
                }
                draw(g, running);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [finish]);

    // Mirror React's phase into the loop's state.
    useEffect(() => {
        if (game.current) game.current.phase = phase;
    }, [phase]);

    return (
        <>
            <div className="convo-head">
                <div>
                    <h2>Tap to flap</h2>
                    <small>Space, tap or click to flap. Don't touch the pipes.</small>
                </div>
            </div>
            <div className="scroll game-scroll">
                <div className="game-cols">
                    <div className="game-play">
                        <div className="flap-stage">
                            <canvas
                                ref={canvas}
                                className="flap-canvas"
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    flap();
                                }}
                                role="img"
                                aria-label="Tap to flap game"
                            />
                            {phase === "ready" && <div className="flap-overlay"><b>Tap to start</b></div>}
                            {phase === "over" && (
                                <div className="flap-overlay">
                                    <b>Game over</b>
                                    <span>Score {score} · Best {best}</span>
                                    {note && <small>{note}</small>}
                                    <button className="lime" onClick={reset}>Try again</button>
                                </div>
                            )}
                        </div>
                        <div className="flap-hud">
                            <span>Score <b>{score}</b></span>
                            <span>Best <b>{best}</b></span>
                        </div>
                    </div>
                    <div className="game-side">
                        <h3>Your crew</h3>
                        <FlapBoard groups={groups} currentUser={currentUser} refreshKey={boardKey} />
                    </div>
                </div>
            </div>
        </>
    );
}

function FlapBoard({ groups, currentUser, refreshKey }) {
    const [groupId, setGroupId] = useState(groups[0]?._id ?? "");
    const [rows, setRows] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!groups.some((g) => g._id === groupId)) setGroupId(groups[0]?._id ?? "");
    }, [groups, groupId]);

    useEffect(() => {
        if (!groupId) return;
        let live = true;
        getFlapLeaderboard(groupId)
            .then((d) => live && (setRows(d.rows), setError("")))
            .catch((err) => live && setError(err.response?.data?.message || "Couldn't load the board."));
        return () => {
            live = false;
        };
    }, [groupId, refreshKey]);

    if (groups.length === 0) return <p className="muted">Make a room with your crew to compare scores.</p>;
    return (
        <div style={{ display: "grid", gap: "10px" }}>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Room">
                {groups.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                ))}
            </select>
            {error && <p className="error">{error}</p>}
            {rows && (
                <div className="lb">
                    {rows.map((row, i) => (
                        <div key={row.userId} className={row.userId === currentUser?._id ? "lb-row me" : "lb-row"}>
                            <span className="rank">{i + 1}</span>
                            <div className="who-col">
                                <b>{row.username}</b>
                                <small>{row.plays === 0 ? "hasn't played yet" : `${row.plays} ${row.plays === 1 ? "play" : "plays"}`}</small>
                            </div>
                            <b className="flap-best">{row.best}</b>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FlapGame;
