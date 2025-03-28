import { Knex, knex } from 'knex';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const connectionSchema = z.object({
  host: z.string().min(1, 'Database host is required'),
  port: z.number().int('Port must be a valid number'),
  user: z.string().min(1, 'Database user is required'),
  password: z.string().min(1, 'Database password is required'),
  database: z.string().min(1, 'Database name is required'),
});

export type ConnectionConfig = z.infer<typeof connectionSchema>;

export function createDbConnection(config: ConnectionConfig): Knex {
  try {
    const validatedConfig = connectionSchema.parse(config);

    return knex({
      client: 'pg',
      connection: validatedConfig,
      pool: {
        min: 2,
        max: 10,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Database configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

// For backwards compatibility with .env files
const envSchema = z.object({
  DB_HOST: z.string().min(1, 'Database host is required'),
  DB_PORT: z.string().transform((val: string, ctx: z.RefinementCtx) => {
    const parsed = parseInt(val);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Port must be a valid number',
      });
      return z.NEVER;
    }
    return parsed;
  }),
  DB_USER: z.string().min(1, 'Database user is required'),
  DB_PASSWORD: z.string().min(1, 'Database password is required'),
  DB_DATABASE: z.string().min(1, 'Database name is required'),
});

function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

// Create default connection from environment variables
export const db = process.env.DB_HOST ? createDbConnection(validateEnv()) : null;

// Test connection and handle errors
db?.raw('SELECT 1')
  .then(() => {
    console.log('Database connection established successfully');
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  }); 