# knex-types-generator

Generate Knex types from a database using schema introspection.


## Prerequisites

- Node.js >= 18
- Copy `.env.example` to `.env` and set the environment variables

## Usage

The CLI accepts a single argument, the path to the output file. By default, it will output to `./types/db.ts`.

```bash
npx knex-types-generator --output <output-file>
```

Then, you can copy the generated types to your project (see [Knex documentation](https://knexjs.org/guide/#typescript)).

## Configuration

The CLI will use the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE` environment variables to connect to the database.

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
  AND st.tablename = c.table_name
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = st.relid
  AND pgd.objsubid = c.ordinal_position
WHERE c.table_name = ?
  AND c.table_schema = ?
ORDER BY c.ordinal_position;
```
This query gets detailed information about columns in a table:
- Basic column info from `information_schema.columns`
- Column comments from `pg_description` via joins through `pg_statio_all_tables`
- Orders by `ordinal_position` to maintain column order
- Uses parameterized queries for safety

### Enums Query
```sql
SELECT 
  t.typname,
  n.nspname,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as enumlabels
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname, n.nspname
ORDER BY t.typname;
```
This query retrieves all enum types:
- Uses `pg_type` to get custom types
- Joins with `pg_enum` to get enum values
- Groups values into an array using `array_agg`
- Maintains order using `enumsortorder`

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.







