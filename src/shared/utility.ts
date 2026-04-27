import { TextEditor, workspace, window, ViewColumn } from "vscode";
import * as Firebird from "node-firebird";
import { Global } from "./global";
import { ConnectionOptions } from "../interfaces";
import { logger } from "../logger/logger";

export interface QueryExecutionMetrics {
  startedAt: number;
  finishedAt: number;
  totalMs: number;
  connectMs: number;
  fetchMs: number;
  blobDecodeMs: number;
  rowCount: number;
  sqlPreview: string;
}

export class Utility {
  private static lastQueryMetrics?: QueryExecutionMetrics;

  public static queryPromise<T>(connection: any, sql: string): Promise<T> {
    return new Promise((resolve, reject) => {
      connection.query(sql, (err: any, rows: any) => {
        if (err) {
          reject("Error queryPromise=======: " + err.message);
        } else {
          connection.detach();
          resolve(rows);
        }
      });
    });
  }

  public static async runQuery(sql?: string, connectionOptions?: ConnectionOptions): Promise<any> {
    logger.debug("Run Query start...");
    this.lastQueryMetrics = undefined;

    if (!sql && !window.activeTextEditor) {
      return Promise.reject({
        notify: true,
        message: "No SQL document opened!",
        options: ["Cancel", "New SQL Document"]
      });
    }
    if (!sql && window.activeTextEditor) {
      if (window.activeTextEditor.document.languageId !== "sql") {
        return Promise.reject({
          notify: true,
          message: "No SQL document opened!",
          options: ["Cancel", "New SQL Document"]
        });
      }
    }
    if (!connectionOptions) {
      if (!Global.activeConnection) {
        return Promise.reject({
          notify: true,
          message: "No Firebird database selected!",
          options: ["Cancel", "Set Active Database"]
        });
      }
    }

    // finally check if empty sql document
    if (!sql) {
      const activeTextEditor = window.activeTextEditor;
      const selection = activeTextEditor!.selection;
      if (selection.isEmpty) {
        sql = activeTextEditor!.document.getText();
      } else {
        sql = activeTextEditor!.document.getText(selection);
      }
      if (!sql) {
        return Promise.reject({ notify: false, message: "No valid SQL commands found!" });
      }
    }

    connectionOptions = connectionOptions ? connectionOptions : Global.activeConnection;

    logger.info("Executing Firebird query...");

    const queryStartedAt = Date.now();

    return await new Promise((resolve, reject) => {
      const connectStartedAt = Date.now();
      Utility.createConnection(connectionOptions)
        .then(connection => {
          const connectMs = Date.now() - connectStartedAt;
          const fetchStartedAt = Date.now();
          connection.query(sql, [], async (err, result) => {
            const fetchMs = Date.now() - fetchStartedAt;
            if (err) {
              connection.detach();
              this.lastQueryMetrics = undefined;
              return reject(err);
            }

            if (result !== undefined) {
              const blobDecodeStartedAt = Date.now();
              // convert blob fields
              for (const resultRow of result) {
                for (const field of Object.keys(resultRow)) {
                  if (resultRow[field] instanceof Function) {
                    await new Promise<void>(res => {
                      resultRow[field]((blobErr: any, _name: any, e: any) => {
                        if (blobErr || !e) { res(); return; }
                        const chunks: Buffer[] = [];
                        e.on("data", (chunk: Buffer) => chunks.push(chunk));
                        e.on("end", () => { resultRow[field] = Buffer.concat(chunks); res(); });
                        e.on("error", () => res());
                      });
                    });
                  }
                }
              }
              const blobDecodeMs = Date.now() - blobDecodeStartedAt;
              connection.detach();
              this.lastQueryMetrics = this.buildQueryMetrics(
                sql,
                queryStartedAt,
                connectMs,
                fetchMs,
                blobDecodeMs,
                Array.isArray(result) ? result.length : 0
              );
              logger.info("Finished Firebird query, displaying results... ");
              return resolve(result);
            } else {
              connection.detach();
              // node-firebird doesn't call back with result on successful DDL statements
              this.lastQueryMetrics = this.buildQueryMetrics(sql, queryStartedAt, connectMs, fetchMs, 0, 0);
              logger.info("Finished Firebird query.");
              const ddl = this.constructResponse(sql);
              return resolve([{ message: `${ddl} command executed successfully!` }]);
            }
          });
        })
        .catch(err => {
          this.lastQueryMetrics = undefined;
          reject(err);
        });
    });
  }

  public static getLastQueryMetrics(): QueryExecutionMetrics | undefined {
    return this.lastQueryMetrics;
  }

  public static async createSQLTextDocument(sql?: string): Promise<TextEditor> {
    const textDocument = await workspace.openTextDocument({ content: sql, language: "sql" });
    return window.showTextDocument(textDocument, ViewColumn.One);
  }

  private static constructResponse(sql: string): string {
    const string = sql.toLowerCase();
    if (string.indexOf("create") > -1) {
      return "Create";
    } else if (string.indexOf("insert") > -1) {
      return "Insert";
    } else if (string.indexOf("alter") > -1) {
      return "Alter";
    } else if (string.indexOf("drop") > -1) {
      return "Drop";
    } else if (string.indexOf("delete") > -1) {
      return "Delete";
    }
    return "Query";
  }

  public static async createConnection(connectionOptions: any): Promise<Firebird.Database> {
    return new Promise<Firebird.Database>((resolve, reject) => {
      Firebird.attach(connectionOptions, (err, db) => {
        if (err) {
          logger.error(err.message);
          return reject(err);
        }
        resolve(db);
      });
    });
  }

  private static buildQueryMetrics(
    sql: string,
    startedAt: number,
    connectMs: number,
    fetchMs: number,
    blobDecodeMs: number,
    rowCount: number
  ): QueryExecutionMetrics {
    const finishedAt = Date.now();
    return {
      startedAt,
      finishedAt,
      totalMs: finishedAt - startedAt,
      connectMs,
      fetchMs,
      blobDecodeMs,
      rowCount,
      sqlPreview: this.getSqlPreview(sql)
    };
  }

  private static getSqlPreview(sql: string): string {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();
    if (normalizedSql.length <= 160) {
      return normalizedSql;
    }
    return `${normalizedSql.slice(0, 157)}...`;
  }
}
