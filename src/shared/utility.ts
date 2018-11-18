import { TextEditor, workspace, window, ViewColumn } from "vscode";
import * as Firebird from "node-firebird";
import { Global } from "./global";
import { ConnectionOptions } from "../interfaces";
import { logger } from "../logger/logger";

export class Utility {
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

    return await new Promise((resolve, reject) => {
      Utility.createConnection(connectionOptions).then(connection => {
        connection.query(sql, [], async (err, result) => {
          if (err) {
            connection.detach();
            return reject(err);
          }

          if (result !== undefined) {
            //convert blob
            await result.forEach(resultRow => {
              Object.keys(resultRow).forEach(field => {
                if (resultRow[field] instanceof Function) {
                  resultRow[field]((err, name, e) => {
                    e.on("data", chunk => {
                      resultRow[field] = chunk;
                    });
                  });
                }
              });
            });
            connection.detach();
            logger.info("Finished Firebird query, displaying results... ");
            return resolve(result);
          } else {
            connection.detach();
            // because node-firebird plugin doesn't have callback on successfull ddl statements (test further)
            logger.info("Finished Firebird query.");
            const ddl = this.constructResponse(sql);
            return resolve([{ message: `${ddl} command executed successfully!` }]);
          }
        });
      });
    });
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
    }
  }

  public static async createConnection(connectionOptions: any): Promise<Firebird.Database> {
    return new Promise<Firebird.Database>((resolve, reject) => {
      Firebird.attach(connectionOptions, (err, db) => {
        if (err) {
          logger.error(err.message);
          reject(err);
        }
        resolve(db);
      });
    });
  }
}
