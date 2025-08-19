import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const teamSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    branchId: { type: Types.ObjectId, ref: 'Branch', required: true },
    departmentId: { type: Types.ObjectId, ref: 'Department', required: true },
  },
  { timestamps: true }
);

teamSchema.index({ code: 1, departmentId: 1 }, { unique: true });

export type Team = InferSchemaType<typeof teamSchema>;
export const TeamModel = model<Team>('Team', teamSchema);
