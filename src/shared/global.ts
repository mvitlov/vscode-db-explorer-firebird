import { StatusBarItem, StatusBarAlignment, window, ExtensionContext } from "vscode";
import { ConnectionOptions } from "../interfaces";
import { Constants } from "../config/constants";
import { logger } from "../logger/logger";

export class Global {
  private static _activeConnection: ConnectionOptions;
  private static firebirdStatusBarItem: StatusBarItem;

  static get activeConnection(): ConnectionOptions {
    return this._activeConnection;
  }

  static set activeConnection(newActiveConnection: ConnectionOptions) {
    if (!this._activeConnection) {
      this._activeConnection = newActiveConnection;
      this.updateStatusBarItems(newActiveConnection);
      logger.showInfo(this.getActiveDbNotifText(newActiveConnection));
    } else {
      if (this._activeConnection.id !== newActiveConnection.id) {
        this._activeConnection = newActiveConnection;
        this.updateStatusBarItems(newActiveConnection);
        logger.showInfo(this.getActiveDbNotifText(newActiveConnection));
      }
    }
  }

  public static setActiveConnectionById(context: ExtensionContext, id: string): void {
    const connections = context.globalState.get<{ [key: string]: ConnectionOptions }>(Constants.ConectionsKey);
    if (Object.keys(connections).indexOf(id) > -1) {
      this.activeConnection = connections[id];
    }
  }

  public static initStatusBarItems(): void {
    if (!this.firebirdStatusBarItem) {
      this.firebirdStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
      this.firebirdStatusBarItem.text = "FIREBIRD: No active database.";
      this.firebirdStatusBarItem.tooltip = "Firebird: No active database. Click to set active database.";
      this.firebirdStatusBarItem.command = "firebird.chooseActive";
      this.firebirdStatusBarItem.show();
    }
  }

  public static updateStatusBarItems(activeConnection: ConnectionOptions): void {
    if (this.firebirdStatusBarItem) {
      this.firebirdStatusBarItem.text = this.getStatusBarItemText(activeConnection);
      this.firebirdStatusBarItem.tooltip = this.getStatusBarTooltipText(activeConnection);
    } else {
      this.firebirdStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
      this.firebirdStatusBarItem.text = this.getStatusBarItemText(activeConnection);
      this.firebirdStatusBarItem.tooltip = this.getStatusBarTooltipText(activeConnection);
      this.firebirdStatusBarItem.show();
    }
  }

  private static getStatusBarItemText(activeConnection: ConnectionOptions): string {
    return `FIREBIRD: $(server) ${activeConnection.host} $(database) ${activeConnection.database
      .split("\\")
      .pop()
      .split("/")
      .pop()}`;
  }

  private static getStatusBarTooltipText(activeConnection: ConnectionOptions): string {
    return `FIREBIRD: Using ${activeConnection.database
      .split("\\")
      .pop()
      .split("/")
      .pop()} database on host ${activeConnection.host}`;
  }

  private static getActiveDbNotifText(newActiveConnection: ConnectionOptions): string {
    return `Active connection: ${newActiveConnection.host}:${newActiveConnection.database
      .split("\\")
      .pop()
      .split("/")
      .pop()}`;
  }
}
