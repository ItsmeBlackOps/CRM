import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const candidateStatuses = ['Active', 'Non Active', 'Offer', 'Backout'] as const;

const candidateSchema = new Schema(
  {
    candidateNameId: { type: Types.ObjectId, ref: 'CandidateName', required: true },
    companyId: { type: Types.ObjectId, ref: 'Company', required: true },
    status: { type: String, enum: candidateStatuses, required: true },
    recruiterId: { type: Types.ObjectId, ref: 'User' },
    teamLeadId: { type: Types.ObjectId, ref: 'User' },
    branchId: { type: Types.ObjectId, ref: 'Branch' },
    departmentId: { type: Types.ObjectId, ref: 'Department' },
    gender: { type: String },
    email: { type: String },
    phone: { type: String },
    createdBy: { type: Types.ObjectId, ref: 'User' },
    updatedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

candidateSchema.index({ recruiterId: 1 });
candidateSchema.index({ teamLeadId: 1 });
candidateSchema.index({ companyId: 1 });
candidateSchema.index({ branchId: 1, departmentId: 1 });
candidateSchema.index({ status: 1, createdAt: -1 });

export type Candidate = InferSchemaType<typeof candidateSchema>;
export const CandidateModel = model<Candidate>('Candidate', candidateSchema);
