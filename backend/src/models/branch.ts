import { Schema, model, type InferSchemaType } from 'mongoose';

const branchSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

branchSchema.index({ code: 1 }, { unique: true });

export type Branch = InferSchemaType<typeof branchSchema>;
export const BranchModel = model<Branch>('Branch', branchSchema);
