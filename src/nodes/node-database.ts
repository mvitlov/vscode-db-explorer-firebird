import { ExtensionContext, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { join } from "path";
import { NodeTable, NodeInfo, NodeCollection, NodeView } from "./";
import { ConnectionOptions, FirebirdTree } from "../interfaces";
import { getOptions, Constants } from "../config";
import { Utility } from "../shared/utility";
import { Global } from "../shared/global";
import { FirebirdTreeDataProvider } from "../firebirdTreeDataProvider";
import { databaseInfoQry, getTablesQuery, getViewsQuery } from "../shared/queries";
import { logger } from "../logger/logger";

export class NodeDatabase implements FirebirdTree {
  constructor(private readonly dbDetails: ConnectionOptions) {}

  // list databases grouped by host names
  public getTreeItem(): TreeItem {
    const databaseName = this.dbDetails.database
      .split("\\")
      .pop()
      .split("/")
      .pop();
    const isActive = Global.isActiveConnection(this.dbDetails);

    return {
      label: databaseName,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: "database",
      tooltip: `[DATABASE] ${this.dbDetails.database}`,
      description: isActive ? "active" : "",
      iconPath: {
        dark: Uri.file(join(__filename, "..", "..", "..", "resources", "icons", "db.svg")),
        light: Uri.file(join(__filename, "..", "..", "..", "resources", "icons", "db.svg"))
      }
    };
  }

  // list database tables
  public async getChildren(): Promise<any> {
    const options = getOptions();
    let tablesQry = getTablesQuery(options.maxTablesCount);
    let viewsQry = getViewsQuery(options.maxTablesCount);

    return Promise.all([
      Utility.createConnection(this.dbDetails).then(connection => Utility.queryPromise<any[]>(connection, tablesQry)),
      Utility.createConnection(this.dbDetails).then(connection => Utility.queryPromise<any[]>(connection, viewsQry))
    ])
      .then(([tables, views]) => {
        const tableNodes = tables.map<NodeTable>(table => {
          return new NodeTable(this.dbDetails, table.TABLE_NAME);
        });
        const viewNodes = views.map<NodeView>(view => {
          return new NodeView(this.dbDetails, view.VIEW_NAME);
        });

        return [
          new NodeCollection("Tables", "table", tableNodes, "tableCollection"),
          new NodeCollection("Views", "symbol-interface", viewNodes, "viewCollection")
        ];
      })
      .catch(err => {
        return [new NodeInfo(err)];
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
