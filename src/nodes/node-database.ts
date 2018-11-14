import { ExtensionContext, TreeItem, TreeItemCollapsibleState } from "vscode";
import { join } from "path";
import { NodeTable, NodeInfo } from "./";
import { ConnectionOptions, FirebirdTree } from "../interfaces";
import { getOptions, Constants } from "../config";
import { Utility } from "../shared/utility";
import { Global } from "../shared/global";
import { FirebirdTreeDataProvider } from "../firebirdTreeDataProvider";
import { databaseInfoQry, getTablesQuery } from "../shared/queries";
import { logger } from "../logger/logger";

export class NodeDatabase implements FirebirdTree {
  constructor(private readonly dbDetails: ConnectionOptions) {}

  // list databases grouped by host names
  public getTreeItem(): TreeItem {
    return {
      label: this.dbDetails.database
        .split("\\")
        .pop()
        .split("/")
        .pop(),
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: "database",
      tooltip: `[DATABASE] ${this.dbDetails.database}`,
      iconPath: {
        dark: join(__filename, "..", "..", "..", "resources", "icons", "dark", "db-dark.svg"),
        light: join(__filename, "..", "..", "..", "resources", "icons", "light", "db-light.svg")
      }
    };
  }

  // list database tables
  public async getChildren(): Promise<any> {
    let tablesQry = getTablesQuery(getOptions().maxTablesCount);

    return Utility.createConnection(this.dbDetails)
      .then(connection => {
        return Utility.queryPromise<any[]>(connection, tablesQry)
          .then(tables => {
            return tables.map<NodeTable>(table => {
              return new NodeTable(this.dbDetails, table.TABLE_NAME);
            });
          })
          .catch(err => {
            return [new NodeInfo(err)];
          });
      })
      .catch(err => {
        logger.error(err);
      });
  }

  //  run predefined sql query
  public async showDatabaseInfo() {
    logger.info("Custom query: Show Database Info");

    const qry = databaseInfoQry;
    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(err => {
        logger.error(err);
      });
  }

  // create new sql document and set active database
  public async newQuery(): Promise<void> {
    Utility.createSQLTextDocument()
      .then(res => {
        if (res) {
          this.setActive();
          logger.info("New Firebird SQL query");
        }
      })
      .catch(err => {
        logger.error(err);
      });
  }

  // delete database connection details and remove it from explorer view
  public async removeDatabase(context: ExtensionContext, firebirdTreeDataProvider: FirebirdTreeDataProvider) {
    logger.info("Remove database start...");

    const connections = context.globalState.get<{ [key: string]: ConnectionOptions }>(Constants.ConectionsKey);

    if (connections) {
      delete connections[this.dbDetails.id];
      await context.globalState.update(Constants.ConectionsKey, connections);
      logger.debug(`Removed connection ${this.dbDetails.id}`);
      firebirdTreeDataProvider.refresh();
      logger.info("Remove database end...");
    }
  }

  // set active database
  public async setActive(): Promise<void> {
    logger.info("Set active connection");
    Global.activeConnection = this.dbDetails;
  }
}
