import { ExtensionContext, window, commands, workspace } from "vscode";
import { Constants, getOptions } from "./config";
import { FirebirdTreeDataProvider } from "./firebirdTreeDataProvider";
import { NodeHost, NodeDatabase, NodeTable, NodeField, NodeView } from "./nodes";
import { Options, FirebirdTree } from "./interfaces";
import { connectionPicker } from "./shared/connection-picker";
import { Utility } from "./shared/utility";
import { Global } from "./shared/global";
import { logger } from "./logger/logger";
import { KeywordsDb } from "./language-server/db-words.provider";
import QueryResultsView from "./result-view";
import LanguageServer from "./language-server";

export function activate(context: ExtensionContext) {
  logger.info(`Activating extension ...`);

  /* load configuration and reload every time it's changed */
  logger.info(`Loading configuration...`);
  let config: Options = getOptions();
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(() => {
      logger.debug("Configuration changed. Reloading configuration...");
      config = getOptions();
      commands.executeCommand("firebird.explorer.refresh");
    })
  );

  /* initialize providers */
  const firebirdLanguageServer = new LanguageServer();
  const firebirdDatabaseWords = new KeywordsDb();
  const firebirdTreeDataProvider = new FirebirdTreeDataProvider(context);
  const firebirdQueryResults = new QueryResultsView(context.extensionPath);

  const showQueryResults = (result: any) => {
    firebirdQueryResults.display(result, config.recordsPerPage, Utility.getLastQueryMetrics());
  };

  const pickActiveConnection = async (): Promise<boolean> => {
    return connectionPicker(context)
      .then(picked => {
        if (picked) {
          const id: string = picked.detail.split(": ").pop();
          Global.setActiveConnectionById(context, id);
          return true;
        }
        return false;
      })
      .catch(() => false);
  };

  const executeQuery = async (scope: "auto" | "selection" | "document" = "auto") => {
    try {
      const res = await Utility.runQueryWithScope(scope);
      if (!res) return;
      if (res[0] && "message" in res[0]) {
        logger.info(res[0].message);
        logger.showInfo(res[0].message);
        commands.executeCommand("firebird.explorer.refresh");
      } else {
        showQueryResults(res);
      }
    } catch (error) {
      if (error.message === "No Firebird database selected!") {
        const picked = await pickActiveConnection();
        if (picked) return executeQuery(scope);
        return;
      }
      logger.error(error.message);
      if (error.notify) {
        logger.showError(error.message, error.options || []).then(selected => {
          if (selected === "New SQL Document") {
            commands.executeCommand("firebird.explorer.newSqlDocument");
          }
          if (selected === "Set Active Database") {
            commands.executeCommand("firebird.chooseActive");
          }
        });
      } else {
        logger
          .showError("Oops! Something went wrong. Check the log output for more details!", [
            "Cancel",
            "Show Log Output"
          ])
          .then(selected => {
            if (selected === "Show Log Output") {
              logger.showOutput();
            }
          });
      }
    }
  };

  context.subscriptions.push(
    window.registerTreeDataProvider(Constants.FirebirdExplorerViewId, firebirdTreeDataProvider),
    firebirdQueryResults,
    firebirdLanguageServer
  );

  firebirdLanguageServer.setSchemaHandler(doc => {
    return firebirdDatabaseWords.getSchema();
  });

  /* EXPLORER TOOLBAR: add new host/database connection */
  context.subscriptions.push(
    commands.registerCommand("firebird.explorer.addConnection", () => {
      firebirdTreeDataProvider.addConnection().catch(err => {
        logger.error(err);
      });
    })
  );

  /* EXPLORER TOOLBAR: create new sql document */
  context.subscriptions.push(
    commands.registerCommand("firebird.explorer.newSqlDocument", () => {
      Utility.createSQLTextDocument()
        .then(res => {
          logger.info("New SQL document created...");
        })
        .catch(err => {
          logger.error(err);
        });
    })
  );

  /* EXPLORER TOOLBAR: refresh explorer view items */
  context.subscriptions.push(
    commands.registerCommand("firebird.explorer.refresh", (node: FirebirdTree) => {
      firebirdTreeDataProvider.refresh(node);
    })
  );

  /* HOST ITEM: remove host and it's associated databases */
  context.subscriptions.push(
    commands.registerCommand("firebird.removeHost", (connectionNode: NodeHost) => {
      connectionNode.removeHost(context, firebirdTreeDataProvider);
    })
  );

  /* DB ITEM: set active database */
  context.subscriptions.push(
    commands.registerCommand("firebird.setActive", (databaseNode: NodeDatabase) => {
      databaseNode.setActive();
    })
  );

  /* DB ITEM: choose active database */
  context.subscriptions.push(
    commands.registerCommand("firebird.chooseActive", () => {
      connectionPicker(context)
        .then(pickedConnection => {
          if (pickedConnection) {
            const id: string = pickedConnection.detail.split(": ").pop();
            Global.setActiveConnectionById(context, id);
          }
        })
        .catch(err => {
          logger.error(err.message);
          logger.showError(err.message, ["Cancel", "Add New Connection"]).then(res => {
            if (res === "Add New Connection") {
              firebirdTreeDataProvider.addConnection().catch(err => {
                logger.error(err);
              });
            }
          });
        });
    })
  );

  /* DB ITEM: create new sql document */
  context.subscriptions.push(
    commands.registerCommand("firebird.newQuery", (databaseNode: NodeDatabase) => {
      databaseNode.newQuery();
    })
  );

  /* DB ITEM: remove database from explorer view */
  context.subscriptions.push(
    commands.registerCommand("firebird.removeDatabase", (databaseNode: NodeDatabase) => {
      databaseNode.removeDatabase(context, firebirdTreeDataProvider);
    })
  );

  /* COMMAND: run document query */
  context.subscriptions.push(
    commands.registerCommand("firebird.runQuery", () => {
      executeQuery("document");
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.runQuerySelection", () => {
      executeQuery("selection");
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.runQueryDocument", () => {
      executeQuery("document");
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.results.show", () => {
      firebirdQueryResults.reopen();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.results.clear", () => {
      firebirdQueryResults.clear();
    })
  );

  // PREDEFINED QUERY COMMANDS

  /* DB ITEM: show database info */
  context.subscriptions.push(
    commands.registerCommand("firebird.showDatabaseInfo", (databaseNode: NodeDatabase) => {
      databaseNode.showDatabaseInfo().then(result => {
        showQueryResults(result);
      });
    })
  );

  /* COMMAND tables node: show table info */
  context.subscriptions.push(
    commands.registerCommand("firebird.showTableInfo", (tableNode: NodeTable) => {
      tableNode
        .showTableInfo()
        .then(result => {
          showQueryResults(result);
        })
        .catch(err => {
          logger.error(err);
          logger
            .showError("Ooops! Something went wrong! Check the log details for more info.", [
              "Cancel",
              "Show Log Details"
            ])
            .then(res => {
              if (res === "Show Log Details") {
                logger.showOutput();
              }
            });
        });
    })
  );

  /* COMMAND tables node: select all records */
  context.subscriptions.push(
    commands.registerCommand("firebird.selectAllRecords", (tableNode: NodeTable) => {
      tableNode.selectAllRecords().then(result => {
        showQueryResults(result);
      });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.table.previewRecords", (tableNode: NodeTable) => {
      tableNode.previewRecords(config.previewRecordLimit).then(result => {
        showQueryResults(result);
      });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.table.countRecords", (tableNode: NodeTable) => {
      tableNode.countRecords().then(result => {
        showQueryResults(result);
      });
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.table.insertSelectTemplate", (tableNode: NodeTable) => {
      tableNode.insertSelectTemplate();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.table.insertPreviewTemplate", (tableNode: NodeTable) => {
      tableNode.insertSelectTemplate(config.previewRecordLimit);
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.table.copyName", (tableNode: NodeTable) => {
      tableNode.copyName();
    })
  );

  context.subscriptions.push(
    commands.registerCommand("firebird.view.previewRecords", (viewNode: NodeView) => {
      viewNode.previewRecords(config.previewRecordLimit).then(result => {
        showQueryResults(result);
      });
    })
  );

  /* COMMAND table node: drop selected table */
  context.subscriptions.push(
    commands.registerCommand("firebird.table.dropTable", (tableNode: NodeTable) => {
      tableNode.dropTable();
    })
  );

  /* COMMAND field node: select all records for single field */
  context.subscriptions.push(
    commands.registerCommand("firebird.selectFieldRecords", (fieldNode: NodeField) => {
      fieldNode.selectAllSingleFieldRecords().then(result => {
        showQueryResults(result);
      });
    })
  );
}

export function deactivate() {}
