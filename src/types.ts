// Database schema types
export interface DatabaseColumn {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue: string | null;
  comment?: string;
}

export interface DatabaseTable {
  name: string;
  schema: string;
  columns: DatabaseColumn[];
}

export interface DatabaseEnum {
  name: string;
  schema: string;
  values: string;
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
  enums: DatabaseEnum[];
}

// Raw database query result types
export interface RawColumn {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  description: string | null;
}

export interface RawEnum {
  typname: string;
  nspname: string;
  enumlabels: string;
} 