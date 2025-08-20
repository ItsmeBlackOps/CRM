import { z } from "zod";
import { logger } from "../lib/logger.js";
import { recordAudit } from "../lib/audit.js";
import { countRequest, countError } from "../lib/metrics.js";
import { BranchModel } from "../models/branch.js";
import { DepartmentModel } from "../models/department.js";
import { TeamModel } from "../models/team.js";
import { CandidateNameModel } from "../models/candidate-name.js";
import { CompanyModel } from "../models/company.js";
import { getJson, setJson } from "../lib/cache.js";
import type { Server, Socket } from "socket.io";

const empty = z.object({}).strict();
const TTL = 600;

function formatError(
  code: "AUTH" | "VALIDATION" | "DB" | "RBAC" | "RATE_LIMIT" | "CACHE",
  message: string,
  fields?: Record<string, unknown>,
) {
  return { code, message, ...(fields ? { fields } : {}) };
}

export function registerListEvents(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("lists:bootstrap", async (payload) => {
      countRequest("lists:bootstrap");
      const parse = empty.safeParse(payload ?? {});
      if (!parse.success) {
        const fields = parse.error.flatten().fieldErrors;
        socket.emit(
          "lists:error",
          formatError("VALIDATION", "Invalid payload", fields),
        );
        logger.warn(
          {
            event: "lists:bootstrap",
            status: "error",
            userId: socket.data.user?.id,
          },
          "validation failed",
        );
        await recordAudit({
          event: "lists:bootstrap",
          userId: socket.data.user?.id,
          role: socket.data.user?.role,
          branchId: socket.data.user?.branchId,
          ip: socket.handshake.address,
          payloadSummary: { invalid: true },
        });
        return;
      }
      try {
        interface BranchList {
          id: string;
          code: string;
          name: string;
        }
        interface DepartmentList {
          id: string;
          code: string;
          name: string;
          branchId?: string;
        }
        interface TeamList {
          id: string;
          code: string;
          name: string;
          branchId?: string;
          departmentId?: string;
        }
        interface CandidateNameList {
          id: string;
          name: string;
        }
        interface CompanyList {
          id: string;
          name: string;
        }

        let branches = await getJson<BranchList[]>("lists", "branches");
        if (!branches) {
          const docs = await BranchModel.find().select("code name").lean();
          branches = docs.map((b) => ({
            id: b._id.toString(),
            code: b.code,
            name: b.name,
          }));
          await setJson("lists", "branches", branches, TTL);
        }
        let departments = await getJson<DepartmentList[]>(
          "lists",
          "departments",
        );
        if (!departments) {
          const docs = await DepartmentModel.find()
            .select("code name branchId")
            .lean();
          departments = docs.map((d) => ({
            id: d._id.toString(),
            code: d.code,
            name: d.name,
            branchId: d.branchId?.toString(),
          }));
          await setJson("lists", "departments", departments, TTL);
        }
        let teams = await getJson<TeamList[]>("lists", "teams");
        if (!teams) {
          const docs = await TeamModel.find()
            .select("code name branchId departmentId")
            .lean();
          teams = docs.map((t) => ({
            id: t._id.toString(),
            code: t.code,
            name: t.name,
            branchId: t.branchId?.toString(),
            departmentId: t.departmentId?.toString(),
          }));
          await setJson("lists", "teams", teams, TTL);
        }
        let candidateNames = await getJson<CandidateNameList[]>(
          "lists",
          "candidateNames",
        );
        if (!candidateNames) {
          const docs = await CandidateNameModel.find().select("name").lean();
          candidateNames = docs.map((c) => ({
            id: c._id.toString(),
            name: c.name,
          }));
          await setJson("lists", "candidateNames", candidateNames, TTL);
        }
        let companies = await getJson<CompanyList[]>("lists", "companies");
        if (!companies) {
          const docs = await CompanyModel.find().select("name").lean();
          companies = docs.map((c) => ({
            id: c._id.toString(),
            name: c.name,
          }));
          await setJson("lists", "companies", companies, TTL);
        }
        const departmentsByBranch = departments.reduce<
          Record<string, DepartmentList[]>
        >((acc, d) => {
          const key = d.branchId as string;
          (acc[key] ||= []).push(d);
          return acc;
        }, {});
        const teamsByDepartment = teams.reduce<Record<string, TeamList[]>>(
          (acc, t) => {
            const key = t.departmentId as string;
            (acc[key] ||= []).push(t);
            return acc;
          },
          {},
        );
        socket.emit("lists:data", {
          branches,
          departmentsByBranch,
          teamsByDepartment,
          candidateNames,
          companies,
        });
        await recordAudit({
          event: "lists:bootstrap",
          userId: socket.data.user?.id,
          role: socket.data.user?.role,
          branchId: socket.data.user?.branchId,
          ip: socket.handshake.address,
        });
      } catch (e) {
        socket.emit("lists:error", formatError("DB", "Failed to load lists"));
        logger.error({
          event: "lists:bootstrap",
          status: "error",
          userId: socket.data.user?.id,
          err: e,
        });
        countError("lists:bootstrap");
      }
    });

    // Future admin/deptHead mutating events should enforce RBAC and invalidate caches.
    // e.g., on successful write: redis.del('lists:branches');
  });
}
