# knex-ts-types-generator

Generate Knex types from a database using schema introspection.

## Installation

```bash
# Using npm
npm install knex-ts-types-generator

# Using pnpm
pnpm add knex-ts-types-generator

# Using yarn
yarn add knex-ts-types-generator

# Or run directly with npx
npx knex-ts-types-generator
```

## Prerequisites

- Node.js >= 18
- PostgreSQL database
- Copy `.env.example` to `.env` and set the environment variables:
  ```env
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=postgres
  DB_PASSWORD=postgres
  DB_DATABASE=your_database
  ```

## Usage

The CLI provides several options for connecting to your database and generating types:

```bash
# Default usage - outputs to ./types/db.ts
npx knex-ts-types-generator

# Specify custom output file
npx knex-ts-types-generator --output ./src/types/database.ts

# Use a different schema (default is 'public')
npx knex-ts-types-generator --schema my_schema

# Preview the generated types without writing to file
npx knex-ts-types-generator --dry-run

# Connect to a specific database
npx knex-ts-types-generator \
  --host localhost \
  --port 5432 \
  --user myuser \
  --password mypassword \
  --database mydb
```

### CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| --output | -o | Output file path | ./types/db.ts |
| --schema | -s | Database schema to introspect | public |
| --host | -h | Database host | localhost |
| --port | -p | Database port | 5432 |
| --user | -u | Database user | postgres |
| --password | | Database password | |
| --database | -d | Database name | |
| --dry-run | | Preview without writing to file | false |

The CLI will first look for connection details in command line arguments, then fall back to environment variables if not provided.

Then, you can copy the generated types to your project (see [Knex documentation](https://knexjs.org/guide/#typescript)).

## Integration with Knex

After generating the types, you need to:

1. Import the generated types in your project
2. Configure Knex to use the types:

```typescript
import { knex } from 'knex'

// The types will be automatically used by Knex
const db = knex({
  client: 'pg',
  connection: {
    // your connection config
  }
})

// You get full type safety:
const users = await db('users')
                .select('id', 'email')
                .where('role', '=', 'admin')
// users is properly typed!
```

For more details on using types with Knex, see the [Knex TypeScript documentation](https://knexjs.org/guide/#typescript).

## Configuration

The CLI will use the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE` environment variables to connect to the database.

## Example Output

The tool will generate TypeScript types based on your database schema. For example, given this schema:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.metadata IS 'Additional user metadata stored as JSON';

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status post_status NOT NULL DEFAULT 'draft',
  tags TEXT[],
  view_count INTEGER DEFAULT 0
);
```

It will generate the following TypeScript types:

```typescript
export type user_role = 'admin' | 'user' | 'guest';
export type post_status = 'draft' | 'published' | 'archived';

export interface users {
  /**
   * @default nextval('users_id_seq'::regclass)
   */
  id: number;

  /**
   * @default null
   */
  name: string;

  /**
   * User email address
   * @default null
   */
  email: string;

  /**
   * @default 'user'::user_role
   */
  role: user_role;

  /**
   * Additional user metadata stored as JSON
   * @default null
   */
  metadata: unknown | null;

  /**
   * @default CURRENT_TIMESTAMP
   */
  created_at: Date | null;
}

export interface posts {
  /**
   * @default nextval('posts_id_seq'::regclass)
   */
  id: number;

  /**
   * @default null
   */
  user_id: number | null;

  /**
   * @default null
   */
  title: string;

  /**
   * @default null
   */
  content: string | null;

  /**
   * @default 'draft'::post_status
   */
  status: post_status;

  /**
   * @default null
   */
  tags: string[] | null;

  /**
   * @default 0
   */
  view_count: number | null;
}

declare module 'knex/types/tables' {
  interface Tables {
    users: users;
    posts: posts;
  }
}
```

## SQL Queries Explained

The tool uses several PostgreSQL system catalog queries to introspect the database schema:

### Tables Query
```sql
SELECT 
  t.table_name,
  t.table_schema
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
```
This query retrieves all tables in the public schema. We filter for `BASE TABLE` to exclude views and other table-like objects.

### Columns Query
```sql
SELECT 
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  pgd.description
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_statio_all_tables st 
  ON st.schemaname = c.table_schema 
  AND st.relname = c.table_name
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = st.relid
  AND pgd.objsubid = c.ordinal_position
WHERE c.table_name = ?
  AND c.table_schema = ?
ORDER BY c.ordinal_position;
```

## Troubleshooting

### Connection Issues
- Make sure your PostgreSQL server is running and accessible
- Verify your `.env` file contains the correct credentials
- Check if you can connect to the database using `psql` or another client
- If using a custom schema, ensure it exists and your user has access to it

### Type Generation Issues
- Ensure your database contains tables in the specified schema
- Check if your user has permission to read schema information
- For custom types (like ENUMs), verify they exist in the target schema
- Use `--dry-run` to preview the generated types without writing to file

### Common Errors
- `Error: connect ECONNREFUSED` - Database server is not running or not accessible
- `Error: permission denied` - Check your database user permissions
- `Error: schema "xyz" does not exist` - Verify the schema name and permissions

For more help, please [open an issue](https://github.com/FaureAlexis/knex-ts-types-generator/issues).