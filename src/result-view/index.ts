import { Disposable } from "vscode";
import { TextDecoder } from "util";
import { join } from "path";

import { QueryResultsView, Message } from "./queryResultsView";
import { QueryExecutionMetrics } from "../shared/utility";
import { Global } from "../shared/global";
import { getOptions } from "../config";

type ResultSet = Array<any>;

export default class ResultView extends QueryResultsView implements Disposable {
  private resultSet?: ResultSet;
  private recordsPerPage: string = getOptions().recordsPerPage;
  private executionMetrics?: QueryExecutionMetrics;

  constructor(private extensionPath: string) {
    super("resultview", "Firebird Query Results");
  }

  display(resultSet: any, recordsPerPage: string, executionMetrics?: QueryExecutionMetrics) {
    this.resultSet = resultSet;
    this.recordsPerPage = recordsPerPage;
    this.executionMetrics = executionMetrics;
    this.setRuntimeTitle();

    /**
     * Path to HTML files for displaying results in VS Code WebView
     * DEV: "src",...
     * PROD: "out",...
     */
    this.show(join(this.extensionPath, "out", "result-view", "htmlContent", "index.html"));
  }

  clear() {
    this.resultSet = [];
    this.recordsPerPage = getOptions().recordsPerPage;
    this.executionMetrics = undefined;
    this.setRuntimeTitle();
    this.show(join(this.extensionPath, "out", "result-view", "htmlContent", "index.html"));
  }

  reopen() {
    this.setRuntimeTitle();
    this.show(join(this.extensionPath, "out", "result-view", "htmlContent", "index.html"));
  }

  handleMessage(message: Message): void {
    let data: Object | undefined;

    if (this.resultSet && message.command === "getData") {
      data = this.getPreparedResults();
      this.send({
        command: "message",
        data: data
      });
    } else {
      this.send({
        command: "message",
        data: {
          tableHeader: [],
          tableBody: [],
          recordsPerPage: this.recordsPerPage,
          execution: this.executionMetrics || null,
          summary: this.getResultSummary(0, 0),
          maxCellPreviewLength: getOptions().maxCellPreviewLength
        }
      });
    }
  }

  /* prepare results before displaying */
  private getPreparedResults(): Object {
    let decoder = new TextDecoder();
    let tableHeader: Object[] = [];
    let tableBody: string[][] = [];
    const maxCellPreviewLength = getOptions().maxCellPreviewLength;

    if (!this.resultSet || this.resultSet.length === 0) {
      return {
        tableHeader: [],
        tableBody: [],
        recordsPerPage: this.recordsPerPage,
        execution: this.executionMetrics || null,
        summary: this.getResultSummary(0, 0)
      };
    }
    /* get table header */
    for (const field in this.resultSet[0]) {
      if (this.resultSet[0].hasOwnProperty(field)) {
        tableHeader.push({ title: field });
      }
    }
    /* get table body */
    this.resultSet.forEach(row => {
      let temp = [];

      for (const field in row) {
        if (row.hasOwnProperty(field)) {
          // check if null
          if (row[field] === null) {
            temp.push("__FIREBIRD_NULL__");
          }
          // check if buffer array
          else if (row[field] instanceof Buffer) {
            temp.push(decoder.decode(row[field]));
          }
          // check if timestamp
          else if (Object.prototype.toString.call(row[field]) === "[object Date]") {
            temp.push(new Date(row[field]).toLocaleString());
          }
          // check if array
          else if (typeof row[field] === "object") {
            temp.push(JSON.stringify(row[field], null, "\t"));
          }
          // else convert to string
          else if (typeof row[field] === "undefined") {
            temp.push("");
          } else {
            temp.push(row[field].toString());
          }
        }
      }
      tableBody.push(temp);
    });

    return {
      tableHeader: tableHeader,
      tableBody: tableBody,
      recordsPerPage: this.recordsPerPage,
      execution: this.executionMetrics || null,
      summary: this.getResultSummary(tableHeader.length, tableBody.length),
      maxCellPreviewLength
    };
  }

  private getResultSummary(columnCount: number, rowCount: number) {
    const connection = Global.activeConnection;
    const database = connection
      ? connection.database
          .split("\\")
          .pop()
          .split("/")
          .pop()
      : null;

    return {
      rowCount,
      columnCount,
      database,
      host: connection ? connection.host : null,
      executedAt: this.executionMetrics ? new Date(this.executionMetrics.finishedAt).toLocaleString() : null
    };
  }

  private setRuntimeTitle() {
    const rows = this.resultSet ? this.resultSet.length : 0;
    const database = Global.activeConnection
      ? Global.activeConnection.database
          .split("\\")
          .pop()
          .split("/")
          .pop()
      : "No active database";

    this.setTitle(`Firebird Results • ${database} • ${rows} row${rows === 1 ? "" : "s"}`);
  }
}
