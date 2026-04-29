import { TreeItem, TreeItemCollapsibleState, ThemeIcon } from "vscode";
import { FirebirdTree, ConnectionOptions } from "../interfaces";
import { Utility } from "../shared/utility";
import { Global } from "../shared/global";
import { logger } from "../logger/logger";

export class NodeView implements FirebirdTree {
  constructor(private readonly dbDetails: ConnectionOptions, private readonly viewName: string) {}

  public getTreeItem(): TreeItem {
    return {
      label: this.viewName.trim(),
      collapsibleState: TreeItemCollapsibleState.None,
      contextValue: "view",
      tooltip: `[VIEW] ${this.viewName.trim()}`,
      iconPath: new ThemeIcon("symbol-interface")
    };
  }

  public async getChildren(): Promise<FirebirdTree[]> {
    return [];
  }

  public async previewRecords(limit: number) {
    logger.info("Custom Query: Preview View Records");

    const qry = `SELECT FIRST ${Math.abs(limit)} * FROM ${this.viewName.trim()};`;
    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails).catch(err => {
      logger.error(err);
    });
  }
}
