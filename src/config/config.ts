import { workspace, WorkspaceConfiguration } from "vscode";
import { Options } from "../interfaces";
import { Level, logger } from "../logger/logger";

const properties = require("../../package.json").contributes.configuration.properties;

export function getOptions() {
  return {
    mockarooApiKey: _mockarooApiKey(),
    maxTablesCount: _maxTablesCount(),
    codeCompletionKeywords: _codeCompletionKeywords(),
    codeCompletionDatabase: _codeCompletionDatabase(),
    logLevel: _logLevel(),
    recordsPerPage: _recordsPerPage(),
    previewRecordLimit: _previewRecordLimit(),
    maxCellPreviewLength: _maxCellPreviewLength()
  } as Options;
}

function getConfig(): WorkspaceConfiguration {
  return workspace.getConfiguration("firebird");
}

function _mockarooApiKey(): string {
  const apiKeyConf: any = getConfig().get("mockarooApiKey");
  // const apiKey: string = properties["firebird.mockarooApiKey"]["default"];

  if (apiKeyConf === "") {
    return "";
  } else {
    return apiKeyConf;
  }
}

function _maxTablesCount(): number {
  const maxTablesCountConf: any = getConfig().get("maxTablesCount");
  const maxTablesCount: number = properties["firebird.maxTablesCount"]["default"];

  if (typeof maxTablesCountConf !== "number") {
    logger.error("Invalid settings detected in Max Tables Count. Fallback to default value.");
    return maxTablesCount;
  } else {
    return maxTablesCountConf;
  }
}

function _codeCompletionKeywords(): boolean {
  const codeCompletionKeywordsConf: any = getConfig().get("codeCompletion.keywords");
  const codeCompletionKeywords: boolean = properties["firebird.codeCompletion.keywords"]["default"];

  if (typeof codeCompletionKeywordsConf !== "boolean") {
    logger.error("Invalid value detected in Code Completion Keywords settings. Fallback to default value.");
    return codeCompletionKeywords;
  } else {
    return codeCompletionKeywordsConf;
  }
}

function _codeCompletionDatabase(): boolean {
  const codeCompletionDatabaseConf: any = getConfig().get("codeCompletion.database");
  const codeCompletionDatabase: boolean = properties["firebird.codeCompletion.database"]["default"];

  if (typeof codeCompletionDatabaseConf !== "boolean") {
    logger.error("Invalid value detected in Code Completion Database settings. Fallback to default value.");
    return codeCompletionDatabase;
  } else {
    return codeCompletionDatabaseConf;
  }
}

function _logLevel(): string {
  const logLevelConf: any = getConfig().get("logLevel");
  const logLevel: string = properties["firebird.logLevel"]["default"];

  if (logLevelConf && (<any>Level)[`${logLevelConf}`] !== null) {
    return logLevelConf.toString();
  } else {
    logger.error("Invalid value detected in Log Level settings. Fallback to default value.");
    return logLevel;
  }
}

function _recordsPerPage(): string {
  const valid: string[] = ["50", "100", "500", "1000", "All records"];
  const recordsPerPageConf: any = getConfig().get("recordsPerPage");
  const recordsPerPage: any = properties["firebird.recordsPerPage"]["default"];

  if (typeof recordsPerPageConf === "string" && valid.indexOf(recordsPerPageConf) > -1) {
    return recordsPerPageConf;
  }
  logger.error("Invalid value detected in Records Per Page settings. Fallback to default value.");
  return recordsPerPage;
}

function _previewRecordLimit(): number {
  const previewRecordLimitConf: any = getConfig().get("previewRecordLimit");
  const previewRecordLimit: number = properties["firebird.previewRecordLimit"]["default"];

  if (typeof previewRecordLimitConf === "number" && previewRecordLimitConf > 0) {
    return previewRecordLimitConf;
  }
  logger.error("Invalid value detected in Preview Record Limit settings. Fallback to default value.");
  return previewRecordLimit;
}

function _maxCellPreviewLength(): number {
  const maxCellPreviewLengthConf: any = getConfig().get("maxCellPreviewLength");
  const maxCellPreviewLength: number = properties["firebird.maxCellPreviewLength"]["default"];

  if (typeof maxCellPreviewLengthConf === "number" && maxCellPreviewLengthConf > 24) {
    return maxCellPreviewLengthConf;
  }
  logger.error("Invalid value detected in Max Cell Preview Length settings. Fallback to default value.");
  return maxCellPreviewLength;
}
