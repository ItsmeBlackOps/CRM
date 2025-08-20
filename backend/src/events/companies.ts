import { z } from "zod";
import { logger } from "../lib/logger.js";
import { recordAudit } from "../lib/audit.js";
import { countRequest, countError, countRateLimit } from "../lib/metrics.js";
import { CompanyModel } from "../models/company.js";
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

export function registerCompanyEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("companies:add", async (payload) => {
      countRequest("companies:add");
      const user = socket.data.user;
      if (user?.role !== "marketingManager") {
        socket.emit("companies:error", formatError("RBAC", "Forbidden"));
        logger.warn(
          { event: "companies:add", status: "error", userId: user?.id },
          "rbac",
        );
        await recordAudit({
          event: "companies:add",
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
          "companies:error",
          formatError("VALIDATION", "Invalid payload", fields),
        );
        logger.warn(
          { event: "companies:add", status: "error", userId: user.id },
          "validation failed",
        );
        await recordAudit({
          event: "companies:add",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { ...payload },
          ip: socket.handshake.address,
        });
        return;
      }
      const key = `ratelimit:${user.id}:companies:add`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > 10) {
        socket.emit(
          "companies:error",
          formatError("RATE_LIMIT", "Too many requests"),
        );
        logger.warn(
          { event: "companies:add", status: "error", userId: user.id },
          "rate limit exceeded",
        );
        countRateLimit("companies:add");
        await recordAudit({
          event: "companies:add",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { rateLimited: true },
          ip: socket.handshake.address,
        });
        return;
      }
      try {
        const doc = await CompanyModel.create({
          name: parse.data.name,
          createdBy: user.id,
          updatedBy: user.id,
        });
        await cacheRedis.del("lists:companies");
        socket.emit("companies:added", {
          company: { id: doc._id.toString(), name: doc.name },
        });
        await recordAudit({
          event: "companies:add",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { name: parse.data.name },
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit(
          "companies:error",
          formatError("DB", "Failed to add company"),
        );
        logger.error({
          event: "companies:add",
          status: "error",
          userId: user.id,
          err: e,
        });
        countError("companies:add");
      }
    });

    socket.on("companies:update", async (payload) => {
      countRequest("companies:update");
      const user = socket.data.user;
      if (user?.role !== "marketingManager") {
        socket.emit("companies:error", formatError("RBAC", "Forbidden"));
        logger.warn(
          { event: "companies:update", status: "error", userId: user?.id },
          "rbac",
        );
        await recordAudit({
          event: "companies:update",
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
          "companies:error",
          formatError("VALIDATION", "Invalid payload", fields),
        );
        logger.warn(
          { event: "companies:update", status: "error", userId: user.id },
          "validation failed",
        );
        await recordAudit({
          event: "companies:update",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { ...payload },
          ip: socket.handshake.address,
        });
        return;
      }
      const key = `ratelimit:${user.id}:companies:update`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
      if (count > 10) {
        socket.emit(
          "companies:error",
          formatError("RATE_LIMIT", "Too many requests"),
        );
        logger.warn(
          { event: "companies:update", status: "error", userId: user.id },
          "rate limit exceeded",
        );
        countRateLimit("companies:update");
        await recordAudit({
          event: "companies:update",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { rateLimited: true },
          ip: socket.handshake.address,
        });
        return;
      }
      try {
        const doc = await CompanyModel.findByIdAndUpdate(
          parse.data.id,
          { name: parse.data.name, updatedBy: user.id },
          { new: true, runValidators: true },
        ).lean();
        if (!doc) {
          socket.emit("companies:error", formatError("DB", "Not found"));
          return;
        }
        await cacheRedis.del("lists:companies");
        socket.emit("companies:updated", {
          company: { id: doc._id.toString(), name: doc.name },
        });
        await recordAudit({
          event: "companies:update",
          userId: user.id,
          role: user.role,
          branchId: user.branchId,
          payloadSummary: { id: parse.data.id, name: parse.data.name },
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit(
          "companies:error",
          formatError("DB", "Failed to update company"),
        );
        logger.error({
          event: "companies:update",
          status: "error",
          userId: user.id,
          err: e,
        });
        countError("companies:update");
      }
    });
  });
}
