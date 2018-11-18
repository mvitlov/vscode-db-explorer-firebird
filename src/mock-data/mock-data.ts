import { Disposable, Uri, ViewColumn, WebviewPanel, WebviewPanelOptions, WebviewOptions, window } from "vscode";
import { dirname, join } from "path";
import { readFile } from "fs";
import { logger } from "../logger/logger";
import { Utility } from "../shared/utility";

export interface Message {
  command: string;
  data: any;
}

export default class MockData implements Disposable {
  private resourceScheme = "vscode-resource";
  private disposable?: Disposable;
  private resourcesPath: string;
  private panel: WebviewPanel | undefined;
  private htmlCache: { [path: string]: string };

  private tableName: string;
  private fields: any;
  private apiKey: string;

  constructor(private extensionPath: string) {
    this.htmlCache = {};
  }

  display(table: string, fields: Array<any>, apiKey: string) {
    this.tableName = table;
    this.fields = fields;
    this.apiKey = apiKey;

    /**
     * Path to HTML files for displaying results in VS Code WebView
     * DEV: => "src",...
     * PROD: => "out",...
     */
    this.show(join(this.extensionPath, "src", "mock-data", "htmlContent", "index.html"));
  }

  show(htmlPath: string) {
    this.resourcesPath = dirname(htmlPath);
    if (!this.panel) {
      this.init();
    }

    this.readWithCache(htmlPath, (html: string) => {
      if (this.panel) {
        // little hack to make the html unique so that the webview is reloaded
        html = html.replace(/\<\/body\>/, `<div id="${this.randomString(8)}"></div></body>`);
        this.panel.webview.html = html;
      }
    });
  }

  private init() {
    let subscriptions = [];

    let options: WebviewPanelOptions & WebviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: false, // we dont need to keep the state
      localResourceRoots: [Uri.parse(this.resourcesPath).with({ scheme: "vscode-resource" })]
    };

    this.panel = window.createWebviewPanel("mockdata", "Generate Mock Data", ViewColumn.Beside, options);

    subscriptions.push(
      this.panel,
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.webview.onDidReceiveMessage((message: Message) => {
        logger.debug(`Received command from webview | Command: ${message.command}`);
        this.handleMessage(message);
      })
    );

    this.disposable = Disposable.from(...subscriptions);
  }

  private readWithCache(path: string, callback: (html: string) => void) {
    let html: string = "";
    if (path in this.htmlCache) {
      html = this.htmlCache[path];
      callback(html);
    } else {
      readFile(path, "utf8", (err, content) => {
        html = content || "";
        html = this.replaceUris(html, path);
        this.htmlCache[path] = html;
        callback(html);
      });
    }
  }

  private replaceUris(html: string, htmlPath: string) {
    let basePath = Uri.parse(dirname(htmlPath))
      .with({ scheme: this.resourceScheme })
      .toString();
    let regex = /(href|src)\=\"(.+?)\"/g;
    html = html.replace(regex, `$1="${basePath + "$2"}"`);
    return html;
  }

  randomString(length: number) {
    return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))
      .toString(36)
      .slice(1);
  }

  handleMessage(message: Message): void {
    let data;
    if (this.tableName && this.fields && this.apiKey && message.command === "getData") {
      data = { tableName: this.tableName, fields: this.fields, apiKey: this.apiKey };
      this.send({
        command: "message",
        data: data
      });
    }
    if (message.command === "gotData") {
      Utility.createSQLTextDocument(`execute block as begin\n${message.data}end`);
    }

    if (message.command === "error") {
      logger.error(message.data);
      if (message.data === "Unauthorized") {
        logger.showError("ERROR: Unauthorized! Please check your API key and try again.");
      }
    }
  }

  send(message: Message) {
    if (this.panel) {
      this.panel.webview.postMessage(message);
      logger.info("Results displayed.");
    }
  }

  dispose() {
    if (this.disposable) {
      this.disposable.dispose();
    }
    this.panel = undefined;
  }
}
