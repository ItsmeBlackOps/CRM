import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { logger } from "./lib/logger.js";
import { joinRooms } from "./lib/rooms.js";
import { logSummary, getSummary } from "./lib/metrics.js";
import { AuditModel } from "./lib/audit.js";
import { BranchModel } from "./models/branch.js";
import { DepartmentModel } from "./models/department.js";
import { TeamModel } from "./models/team.js";
import { UserModel } from "./models/user.js";
import { TaskModel } from "./models/task.js";
import { CandidateModel } from "./models/candidate.js";
import { CandidateNameModel } from "./models/candidate-name.js";
import { CompanyModel } from "./models/company.js";
import { registerAuthEvents } from "./events/auth.js";
import { registerTaskEvents } from "./events/tasks.js";
import { registerListEvents } from "./events/lists.js";
import { registerCandidateNameEvents } from "./events/candidate-names.js";
import { registerCompanyEvents } from "./events/companies.js";
import { cacheRedis } from "./lib/cache.js";

const app = express();
const server = http.createServer(app);

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);
const pubClient = redis.duplicate();
const subClient = redis.duplicate();

const io = new Server(server, {
  transports: ["websocket"],
  cors: { origin: (process.env.CORS_ORIGINS || "").split(",").filter(Boolean) },
});
io.adapter(createAdapter(pubClient, subClient));
registerAuthEvents(io);
registerTaskEvents(io);
registerListEvents(io);
registerCandidateNameEvents(io);
registerCompanyEvents(io);

const maxPayloadBytes =
  (Number(process.env.MAX_PAYLOAD_SIZE_KB || "4") || 4) * 1024;

type ErrorCode =
  | "AUTH"
  | "VALIDATION"
  | "DB"
  | "RBAC"
  | "RATE_LIMIT"
  | "CACHE"
  | "PAYLOAD_TOO_LARGE";
function formatError(
  code: ErrorCode,
  message: string,
  fields?: Record<string, unknown>,
) {
  return { code, message, ...(fields ? { fields } : {}) };
}

io.use((socket, next) => {
  const token =
    (socket.handshake.auth && socket.handshake.auth.token) || undefined;
  if (!token) {
    return next();
  }
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as jwt.JwtPayload & {
      role?: string;
      teamLeadId?: string;
      branchId?: string;
      departmentId?: string;
      teamId?: string;
    };
    socket.data.user = {
      id: (payload.sub as string) || (payload as { id?: string }).id!,
      role: payload.role,
      teamLeadId: payload.teamLeadId,
      branchId: payload.branchId,
      departmentId: payload.departmentId,
      teamId: payload.teamId,
    };
    joinRooms(io, socket, socket.data.user);
    next();
  } catch {
    const err = new Error("Unauthorized") as Error & { data?: unknown };
    err.data = formatError("AUTH", "Invalid token");
    next(err);
  }
});

io.on("connection", (socket) => {
  socket.use(async (packet, next) => {
    const [event, payload] = packet;
    const start = Date.now();

    const size = Buffer.byteLength(JSON.stringify(payload ?? {}));
    if (size > maxPayloadBytes) {
      const err = new Error("Payload too large") as Error & {
        data?: unknown;
      };
      err.data = formatError("PAYLOAD_TOO_LARGE", "Payload too large");
      logger.warn({
        event,
        userId: socket.data.user?.id,
        role: socket.data.user?.role,
        latencyMs: Date.now() - start,
        status: "error",
        err,
      });
      return next(err);
    }

    next();
    const latency = Date.now() - start;
    logger.info({
      event,
      userId: socket.data.user?.id,
      role: socket.data.user?.role,
      latencyMs: latency,
      status: "ok",
    });
  });
});

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/readyz", async (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  let redisReady = false;
  try {
    await redis.ping();
    redisReady = true;
  } catch {
    redisReady = false;
  }
  const ok = mongoReady && redisReady;
  res.status(ok ? 200 : 503).json({ mongo: mongoReady, redis: redisReady });
});

app.get("/version", (_req, res) => {
  res.json({ sha: process.env.GIT_SHA || "dev" });
});

app.get("/metrics", (_req, res) => {
  res.json(getSummary());
});

const PORT = Number(process.env.PORT) || 3000;

export async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }
  await mongoose.connect(process.env.MONGODB_URI as string);
  await Promise.all([
    BranchModel.init(),
    DepartmentModel.init(),
    TeamModel.init(),
    UserModel.init(),
    TaskModel.init(),
    CandidateModel.init(),
    CandidateNameModel.init(),
    CompanyModel.init(),
    AuditModel.init(),
  ]);
  await new Promise<void>((resolve) => server.listen(PORT, () => resolve()));
  logger.info(`Server listening on ${PORT}`);
  return server;
}

export async function shutdown() {
  logger.info("Shutting down");
  logSummary();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await redis.quit();
  await pubClient.quit();
  await subClient.quit();
  await cacheRedis.quit();
}

if (process.env.NODE_ENV !== "test") {
  start().catch((err) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
}

process.on("SIGINT", () => shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => shutdown().then(() => process.exit(0)));

export { app, io, redis, pubClient, subClient, server };
