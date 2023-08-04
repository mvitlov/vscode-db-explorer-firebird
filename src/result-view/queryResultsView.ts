import { WebviewPanel, window, ViewColumn, Disposable, Uri, WebviewPanelOptions, WebviewOptions } from "vscode";
import { EventEmitter } from "events";
import { readFile } from "fs";
import { logger } from "../logger/logger";
import { Utils as UriUtils } from 'vscode-uri';

export interface Message {
  command: string;
  data: Object;
  id?: string;
}

export class QueryResultsView extends EventEmitter implements Disposable {
  private disposable?: Disposable;

  private resourcesPath?: Uri;
  private panel: WebviewPanel | undefined;
  private htmlCache: { [path: string]: string };
  constructor(private type: string, private title: string) {
    super();
    this.htmlCache = {};
  }

  show(htmlPath: Uri) {
    this.resourcesPath = UriUtils.dirname(htmlPath);
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
      localResourceRoots: [this.resourcesPath]
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

  private readWithCache(uri: Uri, callback: (html: string) => void) {
    let html: string = "";
    if (uri.path in this.htmlCache) {
      html = this.htmlCache[uri.path];
      callback(html);
    } else {
      readFile(uri.fsPath, "utf8", (err, content) => {
        html = content || "";
        html = this.replaceUris(html, uri);
        this.htmlCache[uri.path] = html;
        callback(html);
      });
    }
  }

  private replaceUris(html: string, htmlPath: Uri) {
    let basePath = this.panel.webview.asWebviewUri(UriUtils.dirname(htmlPath)).toString();
    let regex = /(href|src)\=\"(.+?)\"/g;
    html = html.replace(regex, `$1="${basePath + "$2"}"`);
    return html;
  }

  send(message: Message) {
    if (this.panel) {
      this.panel.webview.postMessage(message);
      logger.info("Results displayed.");
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
