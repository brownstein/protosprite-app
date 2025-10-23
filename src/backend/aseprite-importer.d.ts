// Module resolution is set to node, which conflicts with the module resolution used
// by my protosprite aseprite importer.
declare module "protosprite-core/importers/aseprite" {
  type SpriteData = import("protosprite-core").Data.SpriteData;

  type ExpectMatch = {
    title?: boolean;
    tag?: boolean;
    layer?: boolean;
    frame?: boolean;
    extension?: boolean;
  };

  type Matcher = (frameName: string) => {
    title?: string;
    tag?: string;
    layer?: string;
    frame?: number;
    extension?: string;
  };

  export function importAsepriteSheetExport(
    sourceSheet: unknown,
    opt?: {
      referenceType?: "file" | "url";
      frameNameFormat?: string;
      assetPath?: string;
      pngArray?: Uint8Array;
      debug?: boolean;
    },
  ): SpriteData;
}
