import { TreeItem, TreeItemCollapsibleState, commands, Uri, env } from "vscode";
import { join } from "path";
import { NodeField, NodeInfo } from ".";
import { ConnectionOptions, FirebirdTree, Options } from "../interfaces";
import {
  selectAllRecordsQuery,
  tableInfoQuery,
  dropTableQuery,
  countRecordsQuery,
  previewRecordsQuery
} from "../shared/queries";
import { Global } from "../shared/global";
import { Utility } from "../shared/utility";
import { logger } from "../logger/logger";

export class NodeTable implements FirebirdTree {
  constructor(private readonly dbDetails: ConnectionOptions, private readonly table: string) {}

  public getTreeItem(): TreeItem {
    return {
      label: this.table.trim(),
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: "table",
      tooltip: `[TABLE] ${this.table}`,
      iconPath: Uri.file(join(__filename, "..", "..", "..", "resources", "icons", "tables.svg"))
    };
  }

  public async getChildren(): Promise<any> {
    let qry = tableInfoQuery(this.table);

    return Utility.createConnection(this.dbDetails)
      .then(connection => {
        return Utility.queryPromise<any[]>(connection, qry)
          .then(fields => {
            return fields.map<NodeField>(field => {
              return new NodeField(field, this.table, this.dbDetails);
            });
          })
          .catch(err => {
            logger.error(err);
            return [new NodeInfo(err)];
          });
      })
      .catch(err => {
        logger.error(err);
      });
  }

  //  run predefined sql query
  public async showTableInfo() {
    logger.info("Custom Query: Show Table Info");

    const qry = tableInfoQuery(this.table.trim());

    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  //  run predefined sql query
  public async selectAllRecords() {
    logger.info("Custom Query: Select All Records");

    const qry = selectAllRecordsQuery(this.table.trim());
    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(err => {
        logger.error(err);
      });
  }

  public async previewRecords(limit: number) {
    logger.info("Custom Query: Preview Records");

    const qry = previewRecordsQuery(this.table.trim(), limit);
    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(err => {
        logger.error(err);
      });
  }

  public async countRecords() {
    logger.info("Custom Query: Count Records");

    const qry = countRecordsQuery(this.table.trim());
    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(err => {
        logger.error(err);
      });
  }

  public async insertSelectTemplate(limit?: number) {
    const sql = limit
      ? `SELECT FIRST ${Math.abs(limit)} *\nFROM ${this.table.trim()}\nORDER BY 1;`
      : `SELECT *\nFROM ${this.table.trim()}\nORDER BY 1;`;

    Global.activeConnection = this.dbDetails;
    return Utility.createSQLTextDocument(sql);
  }

  public async copyName() {
    await env.clipboard.writeText(this.table.trim());
    logger.showInfo(`Copied table name: ${this.table.trim()}`);
  }

  public async dropTable() {
    logger.info("Custom Query: Drop Table");

    const qry = dropTableQuery(this.table.trim());
    Global.activeConnection = this.dbDetails;

    Utility.runQuery(qry, this.dbDetails)
      .then(results => {
        logger.info(results[0].message);
        logger.showInfo(results[0].message);
        commands.executeCommand("firebird.explorer.refresh");
      })
      .catch(err => {
        logger.error(err);
      });
  }
}
