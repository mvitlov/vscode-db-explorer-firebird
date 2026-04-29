import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { FirebirdTree } from "../interfaces";

export class NodeCollection implements FirebirdTree {
  constructor(
    private readonly label: string,
    private readonly iconId: string,
    private readonly children: FirebirdTree[],
    private readonly contextValue: string
  ) {}

  public getTreeItem(): TreeItem {
    return {
      label: this.label,
      collapsibleState: TreeItemCollapsibleState.Expanded,
      contextValue: this.contextValue,
      iconPath: new ThemeIcon(this.iconId)
    };
  }

  public getChildren(): FirebirdTree[] {
    return this.children;
  }
}
