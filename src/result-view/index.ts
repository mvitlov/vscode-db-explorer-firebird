import { Disposable, Uri } from "vscode";
import { TextDecoder } from "util";

import { QueryResultsView, Message } from "./queryResultsView";

type ResultSet = Array<any>;

export default class ResultView extends QueryResultsView implements Disposable {
  private resultSet?: ResultSet;
  private recordsPerPage: string;

  constructor(private extensionUri: Uri) {
    super("resultview", "Firebird Query Results");
  }

  display(resultSet: any, recordsPerPage: string) {
    this.resultSet = resultSet;
    this.recordsPerPage = recordsPerPage;

    /**
     * Path to HTML files for displaying results in VS Code WebView
     * DEV: "src",...
     * PROD: "out",...
     */
    this.show(Uri.joinPath(this.extensionUri, "out", "result-view", "htmlContent", "index.html"));
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
      this.send({ command: "message", data: { tableHeader: [], tableBody: [], recordsPerPage: this.recordsPerPage } });
    }
  }

  /* prepare results before displaying */
  private getPreparedResults(): Object {
    let decoder = new TextDecoder();
    let tableHeader: Object[] = [];
    let tableBody: string[][] = [];

    if (!this.resultSet || this.resultSet.length === 0) {
      return { tableHeader: [], tableBody: [], recordsPerPage: this.recordsPerPage };
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
            temp.push("&lt;null&gt;");
          }
          // check if buffer array
          else if (row[field] instanceof Buffer) {
            temp.push(decoder.decode(row[field]));
          }
          // check if timestamp
          else if (Object.prototype.toString.call(row[field]) === "[object Date]") {
            temp.push(new Date(row[field]).toLocaleDateString());
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

    return { tableHeader: tableHeader, tableBody: tableBody, recordsPerPage: this.recordsPerPage };
  }
}
