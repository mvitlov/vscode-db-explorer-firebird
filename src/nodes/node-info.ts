import { TreeItem } from "vscode";
import { FirebirdTree } from "../interfaces";

export class NodeInfo implements FirebirdTree {
  // @ts-ignore
  constructor(private label?: string) {}

  public getTreeItem(): TreeItem {
    return {};
  }

  public getChildren(): FirebirdTree[] {
    return [];
  }
}
