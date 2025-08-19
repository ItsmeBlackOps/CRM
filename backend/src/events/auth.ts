import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";
import { recordAudit } from "../lib/audit.js";
import { countRequest, countError } from "../lib/metrics.js";
import { UserModel } from "../models/user.js";
import type { Server, Socket } from "socket.io";
import { joinRooms } from "../lib/rooms.js";

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1),
});

export function registerAuthEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("auth:login", async (payload) => {
      countRequest("auth:login");
      const parse = loginSchema.safeParse(payload);
      if (!parse.success) {
        const err = {
          code: "VALIDATION",
          message: "Invalid email or password",
          fields: parse.error.flatten().fieldErrors,
        };
        socket.emit("auth:error", err);
        logger.warn(
          { event: "auth:login", status: "error" },
          "validation failed",
        );
        await recordAudit({
          event: "auth:login",
          payloadSummary: { email: payload?.email },
          ip: socket.handshake.address,
        });
        return;
      }

      const { email, password } = parse.data;
      try {
        const user = await UserModel.findOne({ email: email.toLowerCase() });
        if (!user) {
          socket.emit("auth:error", {
            code: "AUTH",
            message: "Invalid credentials",
          });
          logger.warn(
            { event: "auth:login", status: "error" },
            "user not found",
          );
          await recordAudit({
            event: "auth:login",
            payloadSummary: { email },
            ip: socket.handshake.address,
          });
          return;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          socket.emit("auth:error", {
            code: "AUTH",
            message: "Invalid credentials",
          });
          logger.warn({
            event: "auth:login",
            status: "error",
            userId: user._id,
          });
          await recordAudit({
            event: "auth:login",
            userId: user._id.toString(),
            role: user.role,
            branchId: user.branchId?.toString(),
            payloadSummary: { email },
            ip: socket.handshake.address,
          });
          return;
        }
        const token = jwt.sign(
          {
            sub: user._id.toString(),
            role: user.role,
            branchId: user.branchId,
            departmentId: user.departmentId,
            teamId: user.teamId,
          },
          process.env.JWT_SECRET as string,
          { expiresIn: "1h" },
        );
        joinRooms(io, socket, {
          id: user._id.toString(),
          role: user.role,
          branchId: user.branchId?.toString(),
          departmentId: user.departmentId?.toString(),
          teamId: user.teamId?.toString(),
          teamLeadId: user.teamLeadId?.toString(),
        });
        socket.emit("auth:ok", {
          token,
          userId: user._id.toString(),
          role: user.role,
          branchId: user.branchId,
          departmentId: user.departmentId,
          teamId: user.teamId,
        });
        logger.info({ event: "auth:login", status: "ok", userId: user._id });
        await recordAudit({
          event: "auth:login",
          userId: user._id.toString(),
          role: user.role,
          branchId: user.branchId?.toString(),
          payloadSummary: { email },
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit("auth:error", { code: "DB", message: "Login failed" });
        logger.error({ event: "auth:login", status: "error", err: e });
        countError("auth:login");
      }
    });
  });
}
