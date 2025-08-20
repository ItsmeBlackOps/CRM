/* eslint-disable */
/* eslint-env node, jest */
import { MongoMemoryServer } from "mongodb-memory-server";
import { io as Client } from "socket.io-client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../src/models/user.js";
import { Adapter } from "socket.io-adapter";
import type { Server as HTTPServer } from "http";

jest.setTimeout(20000);

jest.mock("ioredis", () => {
  class RedisMock {
    store = new Map<string, unknown>();
    duplicate() {
      return new RedisMock();
    }
    incr(key: string) {
      const v = ((this.store.get(key) as number | undefined) || 0) + 1;
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

jest.mock("@socket.io/redis-adapter", () => ({ createAdapter: () => Adapter }));

describe("candidate name and company events", () => {
  let mongod: MongoMemoryServer;
  let start: () => Promise<unknown>,
    shutdown: () => Promise<void>,
    server: HTTPServer;
  let url: string;
  let managerToken: string;
  let recruiterToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = "testsecret";
    process.env.PORT = "6013";
    process.env.REDIS_URL = "redis://localhost:6379";
    ({ start, shutdown, server } = await import("../src/server.js"));
    await start();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    url = `http://localhost:${port}`;

    const manager = await UserModel.create({
      email: "mgr@example.com",
      passwordHash: await bcrypt.hash("secret", 10),
      role: "marketingManager",
    });
    managerToken = jwt.sign(
      { sub: manager._id.toString(), role: "marketingManager" },
      process.env.JWT_SECRET as string,
    );

    const recruiter = await UserModel.create({
      email: "rec@example.com",
      passwordHash: await bcrypt.hash("secret", 10),
      role: "recruiter",
    });
    recruiterToken = jwt.sign(
      { sub: recruiter._id.toString(), role: "recruiter" },
      process.env.JWT_SECRET as string,
    );
  });

  afterAll(async () => {
    await shutdown();
    await mongod.stop();
  });

  it("allows marketingManager to add candidate name and company", async () => {
    const client = Client(url, {
      transports: ["websocket"],
      auth: { token: managerToken },
    });
    await new Promise<void>((resolve) => client.on("connect", resolve));

    const cname = await new Promise<{
      type: string;
      data: { candidateName: { name: string } };
    }>((resolve) => {
      client.once("candidateNames:added", (data) =>
        resolve({ type: "added", data }),
      );
      client.once("candidateNames:error", (data) =>
        resolve({ type: "error", data }),
      );
      client.emit("candidateNames:add", { name: "John Doe" });
    });
    expect(cname.type).toBe("added");
    expect(cname.data.candidateName.name).toBe("John Doe");

    const comp = await new Promise<{
      type: string;
      data: { company: { name: string } };
    }>((resolve) => {
      client.once("companies:added", (data) =>
        resolve({ type: "added", data }),
      );
      client.once("companies:error", (data) =>
        resolve({ type: "error", data }),
      );
      client.emit("companies:add", { name: "Acme Corp" });
    });
    expect(comp.type).toBe("added");
    expect(comp.data.company.name).toBe("Acme Corp");
    client.close();
  });

  it("blocks non-manager from adding candidate name and company", async () => {
    const client = Client(url, {
      transports: ["websocket"],
      auth: { token: recruiterToken },
    });
    await new Promise<void>((resolve) => client.on("connect", resolve));

    const cname = await new Promise<{ type: string; data: { code?: string } }>(
      (resolve) => {
        client.once("candidateNames:error", (data) =>
          resolve({ type: "error", data }),
        );
        client.once("candidateNames:added", (data) =>
          resolve({ type: "added", data }),
        );
        client.emit("candidateNames:add", { name: "Jane" });
      },
    );
    expect(cname.type).toBe("error");
    expect(cname.data.code).toBe("RBAC");

    const comp = await new Promise<{ type: string; data: { code?: string } }>(
      (resolve) => {
        client.once("companies:error", (data) =>
          resolve({ type: "error", data }),
        );
        client.once("companies:added", (data) =>
          resolve({ type: "added", data }),
        );
        client.emit("companies:add", { name: "Beta Inc" });
      },
    );
    expect(comp.type).toBe("error");
    expect(comp.data.code).toBe("RBAC");
    client.close();
  });
});
