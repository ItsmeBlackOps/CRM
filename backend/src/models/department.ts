import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const departmentSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    branchId: { type: Types.ObjectId, ref: 'Branch', required: true },
  },
  { timestamps: true }
);

departmentSchema.index({ code: 1, branchId: 1 }, { unique: true });

export type Department = InferSchemaType<typeof departmentSchema>;
export const DepartmentModel = model<Department>('Department', departmentSchema);
