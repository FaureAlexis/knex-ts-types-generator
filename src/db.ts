import { Knex, knex } from 'knex';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

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

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

const env = validateEnv();

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
  },
  pool: {
    min: 2,
    max: 10,
  },
};

export const db = knex(config);

// Test connection and handle errors
db.raw('SELECT 1')
  .then(() => {
    console.log('Database connection established successfully');
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  }); 