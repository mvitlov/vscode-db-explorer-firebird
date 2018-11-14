import { CompletionItemProvider, TextDocument, CompletionItem, CompletionItemKind } from "vscode";
import { Schema, FirebirdSchema, FirebirdReserved } from "../interfaces";
import { firebirdReserved } from "./firebird-reserved";

interface SchemaProvider {
  provideSchema: (doc: TextDocument) => Thenable<FirebirdSchema>;
}

export class CompletionProvider implements CompletionItemProvider {
  constructor(private schemaProvider: SchemaProvider) {}

  provideCompletionItems(document: TextDocument) {
    return this.schemaProvider.provideSchema(document).then(schema => {
      let items = this.getCompletionItems(
        schema.reservedKeywords ? firebirdReserved : undefined,
        schema.tables.length > 0 ? schema.tables : undefined
      );
      return items;
    });
  }

  private getCompletionItems(firebirdReserved?: FirebirdReserved[], tables?: Schema.Table[]) {
    let items: CompletionItem[] = [];
    if (firebirdReserved) {
      items = firebirdReserved.map(word => new KeywordCompletionItem(word));
    }
    if (tables) {
      let tableItems = tables.map(tbl => new TableCompletionItem(tbl.name));

      let columnItems: ColumnCompletionItem[] = [];
      tables.forEach(tbl => {
        columnItems.push(...tbl.fields.map(col => new ColumnCompletionItem(`${tbl.name}.${col.name}`)));
      });
      items.push(...tableItems, ...columnItems);
    }
    return items;
  }
}

class KeywordCompletionItem extends CompletionItem {
  constructor(word: any) {
    super(word.label, CompletionItemKind.Keyword);
    this.detail = word.detail;
    // this.documentation = new MarkdownString(
    //   word.documentation
    //   // "MORE DETAILS:\nhttps://firebirdsql.org/refdocs/langrefupd21-select.html"
    // );
  }
}

class TableCompletionItem extends CompletionItem {
  constructor(label: string) {
    super(label, CompletionItemKind.File);
  }
}

class ColumnCompletionItem extends CompletionItem {
  constructor(label: string) {
    super(label, CompletionItemKind.Field);
  }
}
