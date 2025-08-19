import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const taskSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    forDate: { type: Date, required: true },
    description: { type: String, required: true, minlength: 1, maxlength: 280 },
    createdBy: { type: Types.ObjectId, ref: 'User' },
    updatedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, forDate: 1, createdAt: -1 });

export type Task = InferSchemaType<typeof taskSchema>;
export const TaskModel = model<Task>('Task', taskSchema);
