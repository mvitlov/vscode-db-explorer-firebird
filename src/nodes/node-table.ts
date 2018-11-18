import { TreeItem, TreeItemCollapsibleState, commands, Uri } from "vscode";
import { join } from "path";
import { NodeField, NodeInfo } from ".";
import { ConnectionOptions, FirebirdTree, Options } from "../interfaces";
import { selectAllRecordsQuery, tableInfoQuery, dropTableQuery } from "../shared/queries";
import { Global } from "../shared/global";
import { Utility } from "../shared/utility";
import { logger } from "../logger/logger";
import MockData from "../mock-data/mock-data";

export class NodeTable implements FirebirdTree {
  constructor(private readonly dbDetails: ConnectionOptions, private readonly table: string) {}

  public getTreeItem(): TreeItem {
    return {
      label: this.table.trim(),
      collapsibleState: TreeItemCollapsibleState.Collapsed,
      contextValue: "table",
      tooltip: `[TABLE] ${this.table}`,
      iconPath: {
        dark: join(__filename, "..", "..", "..", "resources", "icons", "dark", "table-dark.svg"),
        light: join(__filename, "..", "..", "..", "resources", "icons", "light", "table-light.svg")
      }
    };
  }

  public async getChildren(): Promise<any> {
    let qry = tableInfoQuery(this.table);

    return Utility.createConnection(this.dbDetails)
      .then(connection => {
        return Utility.queryPromise<any[]>(connection, qry)
          .then(fields => {
            return fields.map<NodeField>(field => {
              return new NodeField(field, this.table, this.dbDetails);
            });
          })
          .catch(err => {
            logger.error(err);
            return [new NodeInfo(err)];
          });
      })
      .catch(err => {
        logger.error(err);
      });
  }

  //  run predefined sql query
  public async showTableInfo() {
    logger.info("Custom Query: Show Table Info");

    const qry = tableInfoQuery(this.table.trim());

    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

  //  run predefined sql query
  public async selectAllRecords() {
    logger.info("Custom Query: Select All Records");

    const qry = selectAllRecordsQuery(this.table.trim());
    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(err => {
        logger.error(err);
      });
  }

  public async dropTable() {
    logger.info("Custom Query: Drop Table");

    const qry = dropTableQuery(this.table.trim());
    Global.activeConnection = this.dbDetails;

    Utility.runQuery(qry, this.dbDetails)
      .then(results => {
        logger.info(results[0].message);
        logger.showInfo(results[0].message);
        commands.executeCommand("firebird.explorer.refresh");
      })
      .catch(err => {
        logger.error(err);
      });
  }

  public async generateMockData(firebirdMockData: MockData, config: Options) {
    let fields = [];
    let apiKey = config.mockarooApiKey;

    if (!apiKey) {
      logger.error(
        "No Mockaroo Api key detected!\nTo generate your API key, create an account at https://www.mockaroo.com/ and insert your API key in extension settings."
      );
      await logger
        .showError("No Mockaroo API key in settings! Unable to generate mock data.", ["Cancel", "Get API key"])
        .then(selected => {
          if (selected === "Get API key") {
            commands.executeCommand("vscode.open", Uri.parse("https://www.mockaroo.com/users/sign_up"));
          }
        });
      return;
    }

    await this.getChildren().then(children => {
      children.filter(data => {
        fields.push({
          name: data.field.FIELD_NAME.trim(),
          type: data.field.FIELD_TYPE.trim() + " (" + data.field.FIELD_LENGTH + ")",
          notnull: data.field.NOT_NULL
        });
      });
    });

    firebirdMockData.display(this.table, fields, apiKey);
  }
}
