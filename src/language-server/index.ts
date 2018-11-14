import { Disposable, languages, TextDocument } from "vscode";
import { CompletionProvider } from "./completionProvider";
import { FirebirdSchema, Schema } from "../interfaces";

export default class LanguageServer implements Disposable {
  private subscriptions: Disposable[];
  private schemaHandler: (doc: TextDocument) => Thenable<FirebirdSchema>;
  private completionProvider: CompletionProvider;

  constructor() {
    this.subscriptions = [];

    this.completionProvider = new CompletionProvider({
      provideSchema: doc => {
        if (this.schemaHandler) {
          return this.schemaHandler(doc);
        } else {
          return Promise.resolve({} as Schema.Database);
        }
      }
    });

    // enable completion for both saved and unsaved sql files
    let documentSelector = [{ scheme: "file", language: "sql" }, { scheme: "untitled", language: "sql" }];
    this.subscriptions.push(languages.registerCompletionItemProvider(documentSelector, this.completionProvider, "*"));
  }

  setSchemaHandler(schemaHandler: (doc: TextDocument) => Thenable<FirebirdSchema>) {
    this.schemaHandler = schemaHandler;
  }

  dispose() {
    Disposable.from(...this.subscriptions).dispose();
  }
}
