import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const roles = ['user', 'recruiter', 'teamLead', 'marketingManager', 'admin'] as const;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roles, required: true },
    branchId: { type: Types.ObjectId, ref: 'Branch' },
    departmentId: { type: Types.ObjectId, ref: 'Department' },
    teamId: { type: Types.ObjectId, ref: 'Team' },
    teamLeadId: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model<User>('User', userSchema);
