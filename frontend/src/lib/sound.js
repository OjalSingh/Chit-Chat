/*
 * Small synthesized sounds. No audio files: each effect is a few short
 * tones made with the Web Audio API, so it adds nothing to the download.
 * Browsers only allow audio after a tap or key press, so the context is
 * created on the first gesture. The on/off choice is kept in this browser.
 * "Buzz" is a short vibration on phones that support it, under the same switch.
 */

const KEY = "sound";
let enabled = true;
try {
    enabled = localStorage.getItem(KEY) !== "off";
} catch {
    /* storage blocked: stay on */
}

let ctx = null;
const listeners = new Set();

function context() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
        } catch {
            return null;
        }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
}

// [frequency Hz, start s, length s, wave]
const EFFECTS = {
    send: [[660, 0, 0.07], [990, 0.07, 0.1]],
    receive: [[880, 0, 0.08], [660, 0.09, 0.12]],
    tap: [[520, 0, 0.04]],
    flap: [[420, 0, 0.06]],
    point: [[880, 0, 0.06], [1320, 0.06, 0.09]],
    hit: [[200, 0, 0.12, "sawtooth"], [120, 0.1, 0.2, "sawtooth"]],
    happy: [[700, 0, 0.06], [900, 0.07, 0.06], [1200, 0.14, 0.1]],
    party: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.08], [1047, 0.24, 0.16]],
};

export function play(name) {
    if (!enabled) return;
    const notes = EFFECTS[name];
    const ac = notes && context();
    if (!ac) return;
    const t0 = ac.currentTime;
    for (const [freq, start, len, wave = "square"] of notes) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = wave;
        osc.frequency.value = freq;
        // Quiet on purpose, with a quick fade so notes don't click.
        gain.gain.setValueAtTime(0.0001, t0 + start);
        gain.gain.exponentialRampToValueAtTime(0.05, t0 + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len);
        osc.connect(gain).connect(ac.destination);
        osc.start(t0 + start);
        osc.stop(t0 + start + len + 0.02);
    }
}

export function buzz(ms = 10) {
    if (enabled && typeof navigator.vibrate === "function") navigator.vibrate(ms);
}

export const isSoundOn = () => enabled;

export function setSound(on) {
    enabled = on;
    try {
        localStorage.setItem(KEY, on ? "on" : "off");
    } catch {
        /* ignore */
    }
    listeners.forEach((fn) => fn(on));
    if (on) play("tap");
}

export function onSoundChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/* Wake the audio engine on the first tap, and tick on ordinary buttons. */
export function installGlobalSounds() {
    document.addEventListener(
        "pointerdown",
        (e) => {
            context();
            const b = e.target.closest?.("button");
            if (b && !b.disabled && !b.classList.contains("send") && !b.classList.contains("pip")) play("tap");
        },
        { capture: true }
    );
}
