import { z } from "zod";
import { logger } from "../lib/logger.js";
import { recordAudit } from "../lib/audit.js";
import { countRequest, countError, countRateLimit } from "../lib/metrics.js";
import { TaskModel } from "../models/task.js";
import { todayUTC } from "../lib/dates.js";
import { redis } from "../server.js";
import type { Server, Socket } from "socket.io";

const createSchema = z.object({
  description: z.string().min(1).max(280),
});

function formatError(
  code: "AUTH" | "VALIDATION" | "DB" | "RBAC" | "RATE_LIMIT" | "CACHE",
  message: string,
  fields?: Record<string, unknown>,
) {
  return { code, message, ...(fields ? { fields } : {}) };
}

export function registerTaskEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("tasks:create", async (payload) => {
      countRequest("tasks:create");
      const user = socket.data.user;
      if (!user?.id) {
        socket.emit("tasks:error", formatError("AUTH", "Unauthorized"));
        logger.warn({ event: "tasks:create", status: "error" }, "unauthorized");
        await recordAudit({
          event: "tasks:create",
          ip: socket.handshake.address,
        });
        return;
      }
      const parse = createSchema.safeParse(payload);
      if (!parse.success) {
        const fields = parse.error.flatten().fieldErrors;
        socket.emit(
          "tasks:error",
          formatError("VALIDATION", "Invalid payload", fields),
        );
        logger.warn(
          { event: "tasks:create", status: "error", userId: user.id },
          "validation failed",
        );
        await recordAudit({
          event: "tasks:create",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { ...payload },
          ip: socket.handshake.address,
        });
        return;
      }
      const key = `ratelimit:${user.id}:tasks:create`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > 10) {
        socket.emit(
          "tasks:error",
          formatError("RATE_LIMIT", "Too many requests"),
        );
        logger.warn(
          { event: "tasks:create", status: "error", userId: user.id },
          "rate limit exceeded",
        );
        countRateLimit("tasks:create");
        await recordAudit({
          event: "tasks:create",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { rateLimited: true },
          ip: socket.handshake.address,
        });
        return;
      }
      try {
        const forDate = new Date(todayUTC());
        const doc = await TaskModel.create({
          userId: user.id,
          forDate,
          description: parse.data.description,
          createdBy: user.id,
        });
        const task = {
          id: doc._id.toString(),
          description: doc.description,
          forDate: todayUTC(),
        };
        io.to(`user:${user.id}`).emit("tasks:created", { task });
        await recordAudit({
          event: "tasks:create",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { description: parse.data.description },
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit("tasks:error", formatError("DB", "Failed to create task"));
        logger.error({
          event: "tasks:create",
          status: "error",
          userId: user.id,
          err: e,
        });
        countError("tasks:create");
      }
    });

    socket.on("tasks:listToday", async () => {
      countRequest("tasks:listToday");
      const user = socket.data.user;
      if (!user?.id) {
        socket.emit("tasks:error", formatError("AUTH", "Unauthorized"));
        logger.warn(
          { event: "tasks:listToday", status: "error" },
          "unauthorized",
        );
        await recordAudit({
          event: "tasks:listToday",
          ip: socket.handshake.address,
        });
        return;
      }
      try {
        const forDate = new Date(todayUTC());
        const docs = await TaskModel.find({ userId: user.id, forDate })
          .select("description forDate")
          .sort({ createdAt: -1 })
          .lean();
        const tasks = docs.map((d) => ({
          id: d._id.toString(),
          description: d.description,
          forDate: todayUTC(),
        }));
        socket.emit("tasks:list", { tasks });
        await recordAudit({
          event: "tasks:listToday",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { count: tasks.length },
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit("tasks:error", formatError("DB", "Failed to list tasks"));
        logger.error({
          event: "tasks:listToday",
          status: "error",
          userId: user.id,
          err: e,
        });
        countError("tasks:listToday");
      }
    });
  });
}
