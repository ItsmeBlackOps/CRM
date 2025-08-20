import { Schema, model, type InferSchemaType } from "mongoose";

const candidateNameSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

candidateNameSchema.index({ name: 1 }, { unique: true });

export type CandidateName = InferSchemaType<typeof candidateNameSchema>;
export const CandidateNameModel = model<CandidateName>(
  "CandidateName",
  candidateNameSchema,
);
