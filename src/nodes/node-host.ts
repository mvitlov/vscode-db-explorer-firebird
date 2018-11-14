import { ExtensionContext, TreeItem, TreeItemCollapsibleState } from "vscode";
import { join } from "path";
import { Constants } from "../config/constants";
import { FirebirdTreeDataProvider } from "../firebirdTreeDataProvider";
import { NodeDatabase } from "./";
import { ConnectionOptions, FirebirdTree } from "../interfaces";
import { logger } from "../logger/logger";

export class NodeHost implements FirebirdTree {
  constructor(private readonly host: string, private readonly dbList: Array<any>) {}

  public getTreeItem(): TreeItem {
    return {
      label: this.host,
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: "host",
      tooltip: `[HOST] ${this.host}`,
      iconPath: {
        dark: join(__filename, "..", "..", "..", "resources", "icons", "dark", "host-dark.svg"),
        light: join(__filename, "..", "..", "..", "resources", "icons", "light", "host-light.svg")
      }
    };
  }

  public async getChildren(): Promise<FirebirdTree[]> {
    return this.dbList.map<NodeDatabase>(db => {
      return new NodeDatabase(db);
    });
  }

  /* remove all databases on selected host and refresh explorer view */
  public async removeHost(context: ExtensionContext, firebirdTreeDataProvider: FirebirdTreeDataProvider) {
    logger.info("Remove server start...");
    const connections = context.globalState.get<{ [key: string]: ConnectionOptions }>(Constants.ConectionsKey) || {};
    await this.dbList.forEach(db => {
      if (Object.keys(connections).indexOf(db.id) > -1) {
        delete connections[db.id];
        logger.debug(`Removed connection ${db.id}`);
      }
    });
    await context.globalState.update(Constants.ConectionsKey, connections);
    logger.info("Remove server end.");
    firebirdTreeDataProvider.refresh();
  }
}
