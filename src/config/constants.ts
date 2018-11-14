const manifest = require("../../package.json");

export namespace Constants {
  /* extension */
  export const Id: string = manifest.name;
  export const DisplayName: string = manifest.displayName;
  export const ConectionsKey: string = "firebird.connections";

  /* output channel */
  export const OutputChannel: string = DisplayName;

  /* explorer */
  export const FirebirdExplorerViewId = manifest.contributes.views["firebird-tree"][0].id;
}
