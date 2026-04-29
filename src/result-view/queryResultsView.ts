import { WebviewPanel, window, ViewColumn, Disposable, Uri, WebviewPanelOptions, WebviewOptions } from "vscode";
import { EventEmitter } from "events";
import { dirname, join } from "path";
import { readFile } from "fs";
import { logger } from "../logger/logger";

export interface Message {
  command: string;
  data: Object;
  id?: string;
}

export class QueryResultsView extends EventEmitter implements Disposable {
  private disposable?: Disposable;

  private resourcesPath: string;
  protected panel: WebviewPanel | undefined;
  private htmlCache: { [path: string]: string };
  constructor(private type: string, private title: string) {
    super();
    this.resourcesPath = "";
    this.htmlCache = {};
  }

  show(htmlPath: string) {
    this.resourcesPath = dirname(htmlPath);
    if (!this.panel) {
      this.init();
    } else {
      this.panel.reveal(ViewColumn.Two, false);
    }

    this.readFile(htmlPath, (html: string) => {
      if (this.panel) {
        html = this.replaceUris(html);
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
      retainContextWhenHidden: false,
      localResourceRoots: [Uri.file(this.resourcesPath)]
    };

    this.panel = window.createWebviewPanel(this.type, this.title, ViewColumn.Two, options);
    subscriptions.push(this.panel);

    subscriptions.push(this.panel.onDidDispose(() => this.dispose()));

    subscriptions.push(
      this.panel.webview.onDidReceiveMessage((message: Message) => {
        logger.debug(`Received command from webview | Command: ${message.command}`);
        this.handleMessage(message);
      })
    );

    this.disposable = Disposable.from(...subscriptions);
  }

  private readFile(path: string, callback: (html: string) => void) {
    if (path in this.htmlCache) {
      callback(this.htmlCache[path]);
    } else {
      readFile(path, "utf8", (_err, content) => {
        const html = content || "";
        this.htmlCache[path] = html;
        callback(html);
      });
    }
  }

  private replaceUris(html: string): string {
    if (!this.panel) { return html; }
    const webview = this.panel.webview;
    // Replace relative src/href with proper webview URIs
    return html.replace(/(href|src)="([^"]+)"/g, (_match, attr, value) => {
      // Skip external URLs and data URIs
      if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("//")) {
        return `${attr}="${value}"`;
      }
      const relativePath = value.replace(/^\/+/, "");
      const absPath = join(this.resourcesPath, relativePath);
      const uri = webview.asWebviewUri(Uri.file(absPath));
      return `${attr}="${uri}"`;
    });
  }

  send(message: Message) {
    if (this.panel) {
      this.panel.webview.postMessage(message);
      logger.info("Results displayed.");
    }
  }

  setTitle(title: string) {
    if (this.panel) {
      this.panel.title = title;
    }
  }

  randomString(length: number) {
    return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))
      .toString(36)
      .slice(1);
  }

  public handleMessage(message: Message) {
    logger.info("HANDLE MESSAGE CALLED");

    throw new Error("Method not implemented");
  }

  dispose() {
    if (this.disposable) {
      this.disposable.dispose();
    }
    this.panel = undefined;
  }
}
