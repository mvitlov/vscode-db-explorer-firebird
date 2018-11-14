import * as Firebird from "node-firebird";
import { Global } from "../shared/global";
import { getOptions } from "../config";
import { getTablesQuery, fieldsQuery } from "../shared/queries";
import { ConnectionOptions, Schema } from "../interfaces";
import { logger } from "../logger/logger";

type ResultSet = Array<any>;

export class KeywordsDb {
  public getSchema() {
    if (!Global.activeConnection) {
      return Promise.resolve({ reservedKeywords: getOptions().codeCompletionKeywords, tables: [] } as Schema.Database);
    } else if (!getOptions().codeCompletionDatabase) {
      return Promise.resolve({ reservedKeywords: getOptions().codeCompletionKeywords, tables: [] } as Schema.Database);
    } else {
      return this.build(Global.activeConnection, getOptions().codeCompletionKeywords, getOptions().maxTablesCount);
    }
  }

  build(
    conOptions: ConnectionOptions,
    codeCompletionKeywords: boolean,
    maxTablesCount: number
  ): Thenable<Schema.Database> {
    return new Promise(resolve => {
      let schema = {
        reservedKeywords: codeCompletionKeywords,
        path: conOptions.database,
        tables: []
      } as Schema.Database;
      let tableNames: string[] = [];

      this.execute(conOptions, getTablesQuery(maxTablesCount), resultSet => {
        if (!resultSet || resultSet.length === 0) {
          return;
        }

        schema.tables = resultSet.map(row => {
          tableNames.push(row.TABLE_NAME.trim());
          return {
            name: row.TABLE_NAME.trim(),
            fields: []
          } as Schema.Table;
        });

        this.execute(conOptions, fieldsQuery(tableNames), resultSet => {
          if (!resultSet || resultSet.length === 0) {
            return;
          }

          let groupedResult: Object = resultSet.reduce(function(r, a) {
            r[a.TBL] = r[a.TBL] || [];
            r[a.TBL].push(a);
            return r;
          }, Object.create(null));

          for (const table in groupedResult) {
            let tableName = table.trim();
            for (let i = 0; i < schema.tables.length; i++) {
              if (schema.tables[i].name === tableName) {
                groupedResult[table].forEach(element => {
                  schema.tables[i].fields.push({
                    name: element.FIELD.trim()
                  } as Schema.Field);
                });
              }
            }
          }
          resolve(schema);
        });
      });
    });
  }

  execute(conOptions: any, query: any, callback: (resultSet?: ResultSet, error?: Error) => void) {
    let resultSet: ResultSet;

    Firebird.attach(conOptions, function(err, db) {
      if (err) {
        logger.error(err.message);
      }
      db.query(query, [], function(err, result) {
        resultSet = result;
        db.detach(err => {
          if (err) {
            logger.error(err.message);
          }
        });
        callback(resultSet, err);
      });
    });
  }
}
