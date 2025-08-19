import { ZodSchema } from 'zod';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    const err = new Error('Invalid payload') as Error & { data?: unknown };
    err.data = { code: 'VALIDATION', message: 'Invalid payload', fields };
    throw err;
  }
  return result.data;
}
