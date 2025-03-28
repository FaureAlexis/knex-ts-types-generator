import { Knex } from 'knex';
import type { DatabaseSchema, DatabaseTable, DatabaseEnum, RawColumn, RawEnum } from './types';

export async function introspectSchema(
  db: Knex,
  schema: string = 'public'
): Promise<DatabaseSchema> {
  const tables = await introspectTables(db, schema);
  const enums = await introspectEnums(db, schema);

  return {
    tables,
    enums,
  };
}

async function introspectTables(
  db: Knex,
  schema: string
): Promise<DatabaseTable[]> {
  // Get all tables in the specified schema
  const tablesQuery = `
    SELECT 
      t.table_name,
      t.table_schema
    FROM information_schema.tables t
    WHERE t.table_schema = ?
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
  `;

  const tables = await db.raw(tablesQuery, [schema]);

  // Get columns for each table
  const result: DatabaseTable[] = [];

  for (const table of tables.rows) {
    const columnsQuery = `
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
    `;

    const columns = await db.raw(columnsQuery, [
      table.table_name,
      table.table_schema,
    ]);

    result.push({
      name: table.table_name,
      schema: table.table_schema,
      columns: columns.rows.map((col: RawColumn) => ({
        name: col.column_name,
        type: col.udt_name === 'USER-DEFINED' ? col.data_type : col.udt_name,
        isNullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        comment: col.description,
      })),
    });
  }

  return result;
}

async function introspectEnums(
  db: Knex,
  schema: string
): Promise<DatabaseEnum[]> {
  const enumsQuery = `
    SELECT 
      t.typname,
      n.nspname,
      array_agg(e.enumlabel ORDER BY e.enumsortorder) as enumlabels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = ?
    GROUP BY t.typname, n.nspname
    ORDER BY t.typname;
  `;

  const enums = await db.raw(enumsQuery, [schema]);

  return enums.rows.map((row: RawEnum) => ({
    name: row.typname,
    schema: row.nspname,
    values: row.enumlabels,
  }));
} 