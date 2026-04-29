import { TextEditor, workspace, window, ViewColumn, Selection } from "vscode";
import * as Firebird from "node-firebird";
import { Global } from "./global";
import { ConnectionOptions } from "../interfaces";
import { logger } from "../logger/logger";

export interface QueryExecutionMetrics {
  startedAt: number;
  finishedAt: number;
  totalMs: number;
  connectMs: number;
  executeMs: number;
  fetchMs: number;
  blobDecodeMs: number;
  rowCount: number;
  sqlPreview: string;
  sql: string;
}

export type QueryExecutionScope = "selection" | "document" | "auto";

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
    return this.runQueryWithScope("auto", sql, connectionOptions);
  }

  public static async runQueryWithScope(
    scope: QueryExecutionScope,
    sql?: string,
    connectionOptions?: ConnectionOptions
  ): Promise<any> {
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
      sql = this.getSqlFromActiveEditor(scope);
      if (!sql) {
        return Promise.reject({
          notify: false,
          message: scope === "selection" ? "No selected SQL commands found!" : "No valid SQL commands found!"
        });
      }
    }

    const rawBindValues = await Utility.collectBindParameters(sql);
    if (rawBindValues === undefined) {
      return undefined;
    }

    let boundSql = sql;
    let bindValues: any[] = rawBindValues;
    if (rawBindValues.length > 0 && /:([a-zA-Z_][a-zA-Z0-9_]*)/.test(sql)) {
      const namedMap = new Map<string, any>();
      let nameIndex = 0;
      const seenNames2 = new Set<string>();
      const nameRegex2 = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
      let m2: RegExpExecArray | null;
      while ((m2 = nameRegex2.exec(sql)) !== null) {
        if (!seenNames2.has(m2[1])) {
          seenNames2.add(m2[1]);
          namedMap.set(m2[1], rawBindValues[nameIndex++]);
        }
      }
      const expanded = Utility.expandNamedParams(sql, namedMap);
      boundSql = expanded.sql;
      bindValues = expanded.values;
    }

    connectionOptions = connectionOptions ? connectionOptions : Global.activeConnection;

    logger.info("Executing Firebird query...");

    const queryStartedAt = Date.now();

    return await new Promise((resolve, reject) => {
      const connectStartedAt = Date.now();
      Utility.createConnection(connectionOptions)
        .then(connection => {
          const connectMs = Date.now() - connectStartedAt;
          const queryStartedAtMs = Date.now();
          const isStreamingQuery = this.shouldUseSequentialFetch(boundSql);

          if (isStreamingQuery) {
            const rows: any[] = [];
            let firstRowAt: number | undefined;

            connection.sequentially(
              boundSql,
              bindValues,
              (row: any) => {
                if (firstRowAt === undefined) {
                  firstRowAt = Date.now();
                }
                rows.push(row);
              },
              (err: any) => {
                const completedAt = Date.now();
                if (err) {
                  connection.detach();
                  this.lastQueryMetrics = undefined;
                  return reject(err);
                }

                connection.detach();
                const executeMs = firstRowAt ? firstRowAt - queryStartedAtMs : completedAt - queryStartedAtMs;
                const fetchMs = firstRowAt ? completedAt - firstRowAt : 0;
                this.lastQueryMetrics = this.buildQueryMetrics(
                  boundSql,
                  queryStartedAt,
                  connectMs,
                  executeMs,
                  fetchMs,
                  0,
                  rows.length
                );
                logger.info("Finished Firebird query, displaying results... ");
                return resolve(rows);
              }
            );
            return;
          }

          connection.query(boundSql, bindValues, async (err, result) => {
            const queryFinishedAt = Date.now();
            const executeMs = queryFinishedAt - queryStartedAtMs;
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
                executeMs,
                0,
                blobDecodeMs,
                Array.isArray(result) ? result.length : 0
              );
              logger.info("Finished Firebird query, displaying results... ");
              return resolve(result);
            } else {
              connection.detach();
              // node-firebird doesn't call back with result on successful DDL statements
              this.lastQueryMetrics = this.buildQueryMetrics(sql, queryStartedAt, connectMs, executeMs, 0, 0, 0);
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
    executeMs: number,
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
      executeMs,
      fetchMs,
      blobDecodeMs,
      rowCount,
      sqlPreview: this.getSqlPreview(sql),
      sql
    };
  }

  private static getSqlPreview(sql: string): string {
    const normalizedSql = sql.replace(/\s+/g, " ").trim();
    if (normalizedSql.length <= 160) {
      return normalizedSql;
    }
    return `${normalizedSql.slice(0, 157)}...`;
  }

  public static async collectBindParameters(sql: string): Promise<any[] | undefined> {
    const paramRegex = /\?|:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const params: Array<{ kind: "positional"; index: number } | { kind: "named"; name: string }> = [];
    const seenNames = new Set<string>();
    let match: RegExpExecArray | null;
    let positionalCount = 0;

    while ((match = paramRegex.exec(sql)) !== null) {
      if (match[0] === "?") {
        positionalCount++;
        params.push({ kind: "positional", index: positionalCount });
      } else {
        const name = match[1];
        if (!seenNames.has(name)) {
          seenNames.add(name);
          params.push({ kind: "named", name });
        }
      }
    }

    if (params.length === 0) {
      return [];
    }

    const values: any[] = [];
    for (const param of params) {
      const prompt = param.kind === "positional"
        ? `Parâmetro ${param.index}`
        : `Parâmetro :${param.name}`;
      const input = await window.showInputBox({
        prompt,
        placeHolder: "Digite o valor (vazio = NULL)",
        ignoreFocusOut: true
      });
      if (input === undefined) {
        return undefined;
      }
      values.push(input === "" ? null : input);
    }

    return values;
  }

  private static expandNamedParams(sql: string, namedMap: Map<string, any>): { sql: string; values: any[] } {
    const values: any[] = [];
    const expandedSql = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_m, name) => {
      values.push(namedMap.get(name) ?? null);
      return "?";
    });
    return { sql: expandedSql, values };
  }

  private static getSqlFromActiveEditor(scope: QueryExecutionScope): string {
    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return "";
    }

    const selection = activeTextEditor.selection;
    if (scope === "document") {
      return activeTextEditor.document.getText().trim();
    }

    if (scope === "selection") {
      return this.getSelectedText(activeTextEditor, selection).trim();
    }

    if (!selection.isEmpty) {
      return this.getSelectedText(activeTextEditor, selection).trim();
    }

    return activeTextEditor.document.getText().trim();
  }

  private static getSelectedText(editor: TextEditor, selection: Selection): string {
    return editor.document.getText(selection);
  }

  private static shouldUseSequentialFetch(sql: string): boolean {
    const normalizedSql = sql.trim().toLowerCase();
    return normalizedSql.startsWith("select") || normalizedSql.startsWith("with");
  }
}
