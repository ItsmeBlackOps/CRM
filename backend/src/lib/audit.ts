import { Schema, model } from "mongoose";

const auditSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    event: { type: String, required: true },
    payloadSummary: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditSchema.index({ userId: 1 });
auditSchema.index({ branchId: 1 });

export const AuditModel = model("Audit", auditSchema);

interface AuditRecord {
  userId?: string;
  role?: string;
  branchId?: string;
  event: string;
  payloadSummary?: unknown;
  ip?: string;
}

export async function recordAudit(record: AuditRecord) {
  await AuditModel.create(record);
}

export function auditsByUser(userId: string) {
  return AuditModel.find({ userId }).lean();
}

export function auditsByBranch(branchId: string) {
  return AuditModel.find({ branchId }).lean();
}
