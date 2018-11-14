import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { TextDecoder } from "util";
import { join } from "path";
import { ConnectionOptions, FirebirdTree } from "../interfaces";
import { selectAllFieldRecordsQuery } from "../shared/queries";
import { logger } from "../logger/logger";
import { Global } from "../shared/global";
import { Utility } from "../shared/utility";

export class NodeField implements FirebirdTree {
  decoder: TextDecoder;
  constructor(
    private readonly field: any,
    private readonly table: string,
    private readonly dbDetails: ConnectionOptions
  ) {
    this.decoder = new TextDecoder();
  }

  public getTreeItem(): TreeItem {
    return {
      label: `${this.field.FIELD_NAME.trim()} : ${this.field.FIELD_TYPE.trim() + " (" + this.field.FIELD_LENGTH + ")"}`,
      collapsibleState: TreeItemCollapsibleState.None,
      contextValue: "field",
      tooltip: this.getTooltip(),
      iconPath: {
        dark: this.setIcon(this.field.CONSTRAINT_TYPE, this.field.NOT_NULL, "dark"),
        light: this.setIcon(this.field.CONSTRAINT_TYPE, this.field.NOT_NULL, "light")
      }
    };
  }

  public async getChildren(): Promise<FirebirdTree[]> {
    return [];
  }

  // sets the correct field icon depending on field type and ui theme color
  private setIcon(constraint: any, notNull: number, tint: string): string {
    const type = this.parseConstraint(constraint);
    if (!type) {
      return notNull ? this.joinPath("notnull", tint) : this.joinPath("null", tint);
    } else if (type.trim() === "PRIMARY KEY") {
      return this.joinPath("primary", tint);
    } else if (type.trim() === "FOREIGN KEY") {
      return this.joinPath("foreign", tint);
    } else if (type.trim() === "UNIQUE") {
      return this.joinPath("unique", tint);
    } else {
      return "";
    }
  }

  // construct tooltip
  private getTooltip(): string {
    let constraint = this.parseConstraint(this.field.CONSTRAINT_TYPE);
    let type = `${this.field.FIELD_TYPE.trim() + " (" + this.field.FIELD_LENGTH + ")"}`;
    let notNull = this.field.NOT_NULL;

    return `${this.field.FIELD_NAME.trim()}\n${type}\n${constraint ? constraint + "\n" : ""}${
      notNull ? "NOT NULL" : "NULL"
    }`;
  }

  // parse buffer array
  private parseConstraint(constraint: any): string | undefined {
    if (constraint instanceof Buffer) {
      return this.decoder.decode(constraint);
    } else {
      return;
    }
  }

  // construct path to icon
  private joinPath(type: string, tint: string): string {
    return join(__filename, "..", "..", "..", "resources", "icons", tint, type + "-" + tint + ".svg");
  }

  //  run predefined sql query
  public async selectAllSingleFieldRecords() {
    logger.info("Custom Query: Select All Single Field Records");

    const qry = selectAllFieldRecordsQuery(this.field.FIELD_NAME, this.table.trim());
    Global.activeConnection = this.dbDetails;

    return Utility.runQuery(qry, this.dbDetails)
      .then(result => {
        return result;
      })
      .catch(err => {
        logger.error(err);
      });
  }
}
