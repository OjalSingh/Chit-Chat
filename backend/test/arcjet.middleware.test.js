import { beforeEach, describe, expect, it, vi } from "vitest";

const protect = vi.fn();
vi.mock("../src/lib/arcjet.js", () => ({ default: { protect } }));
vi.mock("@arcjet/inspect", () => ({ isSpoofedBot: (r) => r.spoofed === true }));

// setup.js stubs this middleware for the API tests; here we want the real one.
const { arcjetProtection } = await vi.importActual("../src/middleware/arcjet.middleware.js");

function run() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const next = vi.fn();
  return arcjetProtection({}, res, next).then(() => ({ res, next }));
}

const decision = ({ denied = false, reason = {}, results = [] } = {}) => ({
  isDenied: () => denied,
  reason: { isRateLimit: () => false, isBot: () => false, ...reason },
  results,
});

describe("arcjetProtection", () => {
  beforeEach(() => {
    protect.mockReset();
  });

  it("lets allowed requests through", async () => {
    protect.mockResolvedValue(decision());
    const { next, res } = await run();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    protect.mockResolvedValue(decision({ denied: true, reason: { isRateLimit: () => true } }));
    const { next, res } = await run();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for bots", async () => {
    protect.mockResolvedValue(decision({ denied: true, reason: { isBot: () => true } }));
    const { res } = await run();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("blocks spoofed bots instead of letting them through", async () => {
    protect.mockResolvedValue(decision({ results: [{ spoofed: true }] }));
    const { next, res } = await run();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("fails open if Arcjet itself is unreachable", async () => {
    protect.mockImplementation(() => {
      throw new Error("network down");
    });
    const { next } = await run();
    expect(next).toHaveBeenCalled();
  });
});
