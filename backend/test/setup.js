import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

process.env.JWT_SECRET ??= "test-secret";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL ??= "http://localhost:5173";

// Arcjet calls a remote API; tests exercise our own logic, so let every request through.
vi.mock("../src/middleware/arcjet.middleware.js", () => ({
  arcjetProtection: (_req, _res, next) => next(),
}));

let memoryServer;

beforeAll(async () => {
  // CI provides a real MongoDB service; locally we fall back to an in-memory one.
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  await mongoose.connect(uri, { dbName: `chitchat-test-${process.pid}` });
});

beforeEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await memoryServer?.stop();
});
