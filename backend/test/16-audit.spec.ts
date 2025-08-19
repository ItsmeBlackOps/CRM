import { MongoMemoryServer } from "mongodb-memory-server";
import { io as Client } from "socket.io-client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../src/models/user.js";
import { AuditModel } from "../src/lib/audit.js";

jest.setTimeout(20000);
jest.mock("ioredis", () => {
  class RedisMock {
    store = new Map<string, any>();
    duplicate() {
      return new RedisMock();
    }
    incr(key: string) {
      const v = (this.store.get(key) || 0) + 1;
      this.store.set(key, v);
      return Promise.resolve(v);
    }
    expire() {
      return Promise.resolve(1);
    }
    ping() {
      return Promise.resolve("PONG");
    }
    get(key: string) {
      return Promise.resolve(this.store.get(key));
    }
    set(key: string, val: string) {
      this.store.set(key, val);
      return Promise.resolve("OK");
    }
    del(key: string) {
      this.store.delete(key);
      return Promise.resolve(1);
    }
    quit() {
      return Promise.resolve();
    }
  }
  return RedisMock;
});

jest.mock("@socket.io/redis-adapter", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Adapter } = require("socket.io-adapter");
  return { createAdapter: () => Adapter };
});

describe("audit logging", () => {
  let mongod: MongoMemoryServer;
  let start: any, shutdown: any, server: any;
  let url: string;
  let token: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = "testsecret";
    process.env.PORT = "6016";
    process.env.REDIS_URL = "redis://localhost:6379";
    ({ start, shutdown, server } = await import("../src/server.js"));
    await start();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    url = `http://localhost:${port}`;

    const user = await UserModel.create({
      email: "audit@example.com",
      passwordHash: await bcrypt.hash("secret", 10),
      role: "user",
    });
    token = jwt.sign(
      { sub: user._id.toString(), role: "user" },
      process.env.JWT_SECRET as string,
    );
  });

  afterAll(async () => {
    await shutdown();
    await mongod.stop();
  });

  it("records an audit entry for tasks:create", async () => {
    const client = Client(url, { transports: ["websocket"], auth: { token } });
    await new Promise<void>((resolve) => client.on("connect", resolve));

    await new Promise((resolve) => {
      client.once("tasks:created", () => resolve(null));
      client.emit("tasks:create", { description: "audit task" });
    });

    const logs = await AuditModel.find({ event: "tasks:create" }).lean();
    expect(logs.length).toBe(1);
    expect(logs[0].payloadSummary.description).toBe("audit task");
    client.close();
  });
});
