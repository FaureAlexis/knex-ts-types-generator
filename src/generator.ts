import fs from 'fs/promises';
import path from 'path';
import { Knex } from 'knex';
import type { DatabaseSchema, DatabaseTable, DatabaseColumn, DatabaseEnum } from './types';
import { introspectSchema } from './introspector';

const pgToTsTypeMap: Record<string, string> = {
  // Numeric types
  'int2': 'number',
  'int4': 'number',
  'int8': 'string', // bigint as string to avoid precision loss
  'float4': 'number',
  'float8': 'number',
  'numeric': 'string', // decimal as string to avoid precision loss
  'money': 'string',

  // Character types
  'varchar': 'string',
  'char': 'string',
  'text': 'string',
  'citext': 'string',
  'uuid': 'string',

  // Boolean type
  'bool': 'boolean',

  // Date/Time types
  'timestamp': 'Date',
  'timestamptz': 'Date',
  'date': 'Date',
  'time': 'string',
  'timetz': 'string',
  'interval': 'string',

  // JSON types
  'json': 'unknown',
  'jsonb': 'unknown',

  // Network address types
  'inet': 'string',
  'cidr': 'string',
  'macaddr': 'string',
  'macaddr8': 'string',

  // Geometric types
  'point': 'string',
  'line': 'string',
  'lseg': 'string',
  'box': 'string',
  'path': 'string',
  'polygon': 'string',
  'circle': 'string',

  // Arrays
  '_int2': 'number[]',
  '_int4': 'number[]',
  '_int8': 'string[]',
  '_float4': 'number[]',
  '_float8': 'number[]',
  '_numeric': 'string[]',
  '_money': 'string[]',
  '_varchar': 'string[]',
  '_char': 'string[]',
  '_text': 'string[]',
  '_uuid': 'string[]',
  '_bool': 'boolean[]',
  '_json': 'unknown[]',
  '_jsonb': 'unknown[]',
};

function getTypeScriptType(column: DatabaseColumn, enums: Set<string>): string {
  let type: string;
  if (enums.has(column.type)) {
    type = column.type;
  } else {
    type = pgToTsTypeMap[column.type] || 'unknown';
  }
  return column.isNullable ? `${type} | null` : type;
}

function generateTableInterface(table: DatabaseTable, enums: Set<string>): string {
  const columns = table.columns
    .map(col => {
      const type = getTypeScriptType(col, enums);
      const comment = col.comment ? `\n   * ${col.comment}` : '';
      return `  /**${comment}
   * @default ${col.defaultValue === null ? 'null' : col.defaultValue}
   */
  ${col.name}: ${type};`;
    })
    .join('\n\n');

  return `export interface ${table.name} {
${columns}
}`;
}

function generateEnumType(enumType: DatabaseEnum): string {
  const values = enumType.values
    .replace('{', '')
    .replace('}', '')
    .split(',')
    .map((value: string) => `  '${value}'`)
    .join(' |\n');

  return `export type ${enumType.name} =\n${values};`;
}

function generateKnexTables(tables: DatabaseTable[]): string {
  const tableNames = tables
    .map(table => `    ${table.name}: ${table.name};`)
    .join('\n');

  return `declare module 'knex/types/tables' {
  interface Tables {
${tableNames}
  }
}`;
}

export async function generateTypes(
  outputPath: string,
  db: Knex,
  schema: string = 'public'
): Promise<void> {
  // Create output directory if it doesn't exist
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Get database schema
  const dbSchema = await introspectSchema(db, schema);

  // Create a set of enum names for quick lookup
  const enumNames = new Set<string>(dbSchema.enums.map(e => e.name));

  // Generate type definitions
  const enumTypes = dbSchema.enums
    .map(e => generateEnumType(e))
    .join('\n\n');

  const tableInterfaces = dbSchema.tables
    .map(table => generateTableInterface(table, enumNames))
    .join('\n\n');

  console.log('Enum Types:', dbSchema.enums.length);
  console.log('Table Interfaces:', dbSchema.tables.length);

  const knexTables = generateKnexTables(dbSchema.tables);

  // Combine all type definitions
  const content = `// This file is auto-generated. Do not edit it manually.

${enumTypes}

${tableInterfaces}

${knexTables}
`;

  // Write to file
  await fs.writeFile(outputPath, content, 'utf-8');
} 