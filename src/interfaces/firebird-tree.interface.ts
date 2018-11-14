import { TreeItem } from "vscode";
/**
 * Explorer view
 */
export interface FirebirdTree {
  getTreeItem(): TreeItem | Promise<TreeItem>;
  getChildren(): FirebirdTree[] | Promise<FirebirdTree[]>;
}
