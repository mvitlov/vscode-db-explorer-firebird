/**
 * Firebird connection options
 *
 * https://www.npmjs.com/package/node-firebird
 */
export interface ConnectionOptions {
  id: string;
  host: string;
  port: any;
  database: string;
  user: string;
  password: string;
}
