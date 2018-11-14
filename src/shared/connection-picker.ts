import { QuickPickItem, window, ExtensionContext } from "vscode";
import { logger } from "../logger/logger";
import { ConnectionOptions } from "../interfaces";
import { Constants } from "../config/constants";

export async function connectionPicker(context: ExtensionContext): Promise<QuickPickItem> {
  logger.info("Choose Active Connection start...");

  return await getAvailableConnections(context).then(connections => {
    return showQuickPick(connections);
  });
}

async function getAvailableConnections(context: ExtensionContext): Promise<QuickPickItem[]> {
  /* fetch saved connections if any */
  let savedConnections = await context.globalState.get<{ [key: string]: ConnectionOptions }>(Constants.ConectionsKey);

  if (!savedConnections) {
    savedConnections = {};
  }

  if (!Object.keys(savedConnections).length) {
    return Promise.reject(new Error("FIREBIRD: No saved connections found."));
  }

  return Object.keys(savedConnections).map(id => ({
    label:
      savedConnections[id].host +
      ":" +
      savedConnections[id].database
        .split("\\")
        .pop()
        .split("/")
        .pop(),

    detail: "connection id: " + id
  }));
}

async function showQuickPick(connections: QuickPickItem[]): Promise<QuickPickItem> {
  return await window.showQuickPick(connections, {
    placeHolder: "FIREBIRD: Choose Active Database"
  });
}
