/* Helpers for the date and time inputs. */

const pad = (n) => String(n).padStart(2, "0");

/* A Date as the "YYYY-MM-DDTHH:mm" text a datetime-local input wants (local time). */
export function toLocalInput(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* "Sat, 8 Nov, 7:30 pm" in the viewer's own time zone. */
export function prettyWhen(value) {
    return new Date(value).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/* A few one-tap starting points; the person can still fine-tune the input. */
export function quickTimes(now = new Date()) {
    const at = (daysAhead, hour) => {
        const d = new Date(now);
        d.setDate(d.getDate() + daysAhead);
        d.setHours(hour, 0, 0, 0);
        return d;
    };
    const out = [];
    const tonight = at(0, 20);
    if (tonight > now) out.push(["Tonight 8pm", tonight]);
    out.push(["Tomorrow 7pm", at(1, 19)]);
    const toSat = (6 - now.getDay() + 7) % 7 || 7;
    out.push(["Saturday 6pm", at(toSat, 18)]);
    return out;
}
