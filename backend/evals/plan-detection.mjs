/*
 * Live eval for the Plan card detector. Calls the real model, so it needs
 * ANTHROPIC_API_KEY and costs a few cents per run.
 *
 *   node evals/plan-detection.mjs
 *
 * Prints per-case results plus precision and recall, and exits non-zero
 * if either drops below the thresholds at the bottom of this file.
 */
import { readFileSync } from "node:fs";
import { extractPlan } from "../src/services/planExtractor.js";

const cases = JSON.parse(readFileSync(new URL("./plan-detection.cases.json", import.meta.url)));
const now = new Date("2026-11-03T10:00:00+05:30"); // a Tuesday

let tp = 0, fp = 0, fn = 0, tn = 0;
for (const c of cases) {
  const messages = c.chat.map(([senderName, text], i) => ({
    senderName,
    text,
    createdAt: new Date(now.getTime() - (c.chat.length - i) * 60_000),
  }));
  const started = Date.now();
  const plan = await extractPlan({ messages, now });
  const got = Boolean(plan);
  if (got && c.expect) tp++;
  else if (got && !c.expect) fp++;
  else if (!got && c.expect) fn++;
  else tn++;
  const mark = got === c.expect ? "ok  " : "MISS";
  console.log(`${mark} ${c.id.padEnd(20)} expected=${c.expect} got=${got} ${plan ? JSON.stringify({ title: plan.title, when: plan.whenText, options: plan.timeOptions.map((o) => o.label) }) : ""} ${Date.now() - started}ms`);
}

const precision = tp / Math.max(tp + fp, 1);
const recall = tp / Math.max(tp + fn, 1);
console.log(`\nprecision ${precision.toFixed(2)}  recall ${recall.toFixed(2)}  (tp ${tp}, fp ${fp}, fn ${fn}, tn ${tn})`);
if (precision < 0.9 || recall < 0.8) process.exit(1);
