import { Schema, model, type InferSchemaType } from "mongoose";

const companySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

companySchema.index({ name: 1 }, { unique: true });

export type Company = InferSchemaType<typeof companySchema>;
export const CompanyModel = model<Company>("Company", companySchema);
