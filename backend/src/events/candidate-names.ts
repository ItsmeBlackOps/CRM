import { z } from "zod";
import { logger } from "../lib/logger.js";
import { recordAudit } from "../lib/audit.js";
import { countRequest, countError, countRateLimit } from "../lib/metrics.js";
import { CandidateNameModel } from "../models/candidate-name.js";
import { redis } from "../server.js";
import { cacheRedis } from "../lib/cache.js";
import type { Server, Socket } from "socket.io";

const addSchema = z.object({ name: z.string().min(1) });
const updateSchema = z.object({ id: z.string(), name: z.string().min(1) });

function formatError(
  code: "AUTH" | "VALIDATION" | "DB" | "RBAC" | "RATE_LIMIT" | "CACHE",
  message: string,
  fields?: Record<string, unknown>,
) {
  return { code, message, ...(fields ? { fields } : {}) };
}

export function registerCandidateNameEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("candidateNames:add", async (payload) => {
      countRequest("candidateNames:add");
      const user = socket.data.user;
      if (user?.role !== "marketingManager") {
        socket.emit("candidateNames:error", formatError("RBAC", "Forbidden"));
        logger.warn(
          { event: "candidateNames:add", status: "error", userId: user?.id },
          "rbac",
        );
        await recordAudit({
          event: "candidateNames:add",
          userId: user?.id,
          role: user?.role,
          branchId: user?.branchId,
          ip: socket.handshake.address,
          payloadSummary: { rbac: true },
        });
        return;
      }
      const parse = addSchema.safeParse(payload ?? {});
      if (!parse.success) {
        const fields = parse.error.flatten().fieldErrors;
        socket.emit(
          "candidateNames:error",
          formatError("VALIDATION", "Invalid payload", fields),
        );
        logger.warn(
          {
            event: "candidateNames:add",
            status: "error",
            userId: user.id,
          },
          "validation failed",
        );
        await recordAudit({
          event: "candidateNames:add",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { ...payload },
          ip: socket.handshake.address,
        });
        return;
      }
      const key = `ratelimit:${user.id}:candidateNames:add`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > 10) {
        socket.emit(
          "candidateNames:error",
          formatError("RATE_LIMIT", "Too many requests"),
        );
        logger.warn(
          { event: "candidateNames:add", status: "error", userId: user.id },
          "rate limit exceeded",
        );
        countRateLimit("candidateNames:add");
        await recordAudit({
          event: "candidateNames:add",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { rateLimited: true },
          ip: socket.handshake.address,
        });
        return;
      }
      try {
        const doc = await CandidateNameModel.create({
          name: parse.data.name,
          createdBy: user.id,
          updatedBy: user.id,
        });
        await cacheRedis.del("lists:candidateNames");
        socket.emit("candidateNames:added", {
          candidateName: { id: doc._id.toString(), name: doc.name },
        });
        await recordAudit({
          event: "candidateNames:add",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { name: parse.data.name },
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit(
          "candidateNames:error",
          formatError("DB", "Failed to add candidate name"),
        );
        logger.error({
          event: "candidateNames:add",
          status: "error",
          userId: user.id,
          err: e,
        });
        countError("candidateNames:add");
      }
    });

    socket.on("candidateNames:update", async (payload) => {
      countRequest("candidateNames:update");
      const user = socket.data.user;
      if (user?.role !== "marketingManager") {
        socket.emit("candidateNames:error", formatError("RBAC", "Forbidden"));
        logger.warn(
          {
            event: "candidateNames:update",
            status: "error",
            userId: user?.id,
          },
          "rbac",
        );
        await recordAudit({
          event: "candidateNames:update",
          userId: user?.id,
          role: user?.role,
          branchId: user?.branchId,
          ip: socket.handshake.address,
          payloadSummary: { rbac: true },
        });
        return;
      }
      const parse = updateSchema.safeParse(payload ?? {});
      if (!parse.success) {
        const fields = parse.error.flatten().fieldErrors;
        socket.emit(
          "candidateNames:error",
          formatError("VALIDATION", "Invalid payload", fields),
        );
        logger.warn(
          {
            event: "candidateNames:update",
            status: "error",
            userId: user.id,
          },
          "validation failed",
        );
        await recordAudit({
          event: "candidateNames:update",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { ...payload },
          ip: socket.handshake.address,
        });
        return;
      }
      const key = `ratelimit:${user.id}:candidateNames:update`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > 10) {
        socket.emit(
          "candidateNames:error",
          formatError("RATE_LIMIT", "Too many requests"),
        );
        logger.warn(
          {
            event: "candidateNames:update",
            status: "error",
            userId: user.id,
          },
          "rate limit exceeded",
        );
        countRateLimit("candidateNames:update");
        await recordAudit({
          event: "candidateNames:update",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { rateLimited: true },
          ip: socket.handshake.address,
        });
        return;
      }
      try {
        const doc = await CandidateNameModel.findByIdAndUpdate(
          parse.data.id,
          { name: parse.data.name, updatedBy: user.id },
          { new: true, runValidators: true },
        ).lean();
        if (!doc) {
          socket.emit("candidateNames:error", formatError("DB", "Not found"));
          return;
        }
        await cacheRedis.del("lists:candidateNames");
        socket.emit("candidateNames:updated", {
          candidateName: { id: doc._id.toString(), name: doc.name },
        });
        await recordAudit({
          event: "candidateNames:update",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { id: parse.data.id, name: parse.data.name },
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit(
          "candidateNames:error",
          formatError("DB", "Failed to update candidate name"),
        );
        logger.error({
          event: "candidateNames:update",
          status: "error",
          userId: user.id,
          err: e,
        });
        countError("candidateNames:update");
      }
    });
  });
}
