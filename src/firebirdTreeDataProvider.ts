import { TreeDataProvider, EventEmitter, Event, ExtensionContext, TreeItem } from "vscode";
import * as uuidv1 from "uuid/v1";
import { NodeHost } from "./nodes";
import { ConnectionOptions, FirebirdTree } from "./interfaces";
import { connectionWizard } from "./shared/connection-wizard";
import { Constants } from "./config/constants";
import { Global } from "./shared/global";
import { logger } from "./logger/logger";

export class FirebirdTreeDataProvider implements TreeDataProvider<FirebirdTree> {
  public _onDidChangeTreeData: EventEmitter<FirebirdTree> = new EventEmitter<FirebirdTree>();
  public readonly onDidChangeTreeData: Event<FirebirdTree> = this._onDidChangeTreeData.event;

  private savedConnections: { [key: string]: ConnectionOptions };

  constructor(private context: ExtensionContext) {}

  public getTreeItem(element: FirebirdTree): Promise<TreeItem> | TreeItem {
    return element.getTreeItem();
  }

  public getChildren(element?: FirebirdTree): Thenable<FirebirdTree[]> | FirebirdTree[] {
    if (!element) {
      return this.getHostNodes();
    }
    return element.getChildren();
  }

  /* add new Firebird connection */
  public async addConnection() {
    logger.info("Add Connection start...");

    /* generate unique id for new connection */
    const id = await uuidv1();

    /* fetch saved connections for update*/
    this.savedConnections = await this.context.globalState.get<{ [key: string]: ConnectionOptions }>(
      Constants.ConectionsKey
    );

    if (!this.savedConnections) {
      logger.debug("No saved connections found...");
      this.savedConnections = {};
    }

    logger.debug(`${Object.keys(this.savedConnections).length} saved connection(s) found...`);

    /* present connection wizard */
    await connectionWizard()
      .then(async newOptions => {
        newOptions.id = id;
        newOptions.port = Number.parseInt(newOptions.port);
        this.savedConnections[id] = newOptions;

        await this.context.globalState.update(Constants.ConectionsKey, this.savedConnections).then(
          () => {
            Global.activeConnection = newOptions;
            this.refresh();
            logger.info("Add Connection end...");
            logger.debug(`Connection ID: ${this.savedConnections[id].id}`);
            logger.showInfo("New Firebird connection added successfully!");
          },
          err => {
            logger.error(err);
          }
        );
      })
      .catch(error => {
        logger.error(error);
      });
  }

  private async getHostNodes(): Promise<NodeHost[]> {
    logger.debug("Get host nodes start.");
    const connections = this.context.globalState.get<{ [key: string]: ConnectionOptions }>(Constants.ConectionsKey);
    const NodeHosts = [];

    if (connections) {
      const groupedConnections = this.groupedArray(connections);

      for (const key in groupedConnections) {
        NodeHosts.push(new NodeHost(key, groupedConnections[key]));
      }
    }
    Global.initStatusBarItems();
    logger.debug("Get host nodes end.");
    return NodeHosts;
  }

  private groupedArray(connections: Object) {
    return Object.keys(connections)
      .map(id => {
        connections[id].id = id;
        return connections[id];
      })
      .reduce((h, a) => Object.assign(h, { [a.host]: (h[a.host] || []).concat(a) }), {});
  }

  public refresh(element?: FirebirdTree): void {
    logger.debug("Refresh Firebird Explorer View");
    this._onDidChangeTreeData.fire(element);
  }
}
