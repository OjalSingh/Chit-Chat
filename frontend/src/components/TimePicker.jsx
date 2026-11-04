import { quickTimes, toLocalInput } from "../lib/when";

/*
 * A date and time field with one-tap shortcuts. `value` is the
 * datetime-local text ("" when empty). Typing, the browser's own
 * picker, and the shortcuts all go through onChange.
 */
function TimePicker({ value, onChange, id, label = "Date and time" }) {
    return (
        <div className="timepicker">
            <input
                id={id}
                type="datetime-local"
                value={value}
                min={toLocalInput(new Date())}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
            />
            <div className="chips">
                {quickTimes().map(([text, date]) => (
                    <button key={text} type="button" className="small plain" onClick={() => onChange(toLocalInput(date))}>
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default TimePicker;
