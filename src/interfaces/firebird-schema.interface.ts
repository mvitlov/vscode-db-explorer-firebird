/**
 * Code completion schema for table and field names
 */
export type FirebirdSchema = Schema.Database;

export namespace Schema {
  export interface Database {
    reservedKeywords: boolean;
    path: string;
    tables: Schema.Table[];
  }

  export interface Table {
    name: string;
    fields: Schema.Field[];
  }

  export interface Field {
    name: string;
  }
}
