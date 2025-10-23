declare module "protosprite-core/transform" {
  type SpriteSheetData = import("protosprite-core").Data.SpriteSheetData;
  async function packSpriteSheet(
    sheet: SpriteSheetData,
    opt?: {
      padding: number;
    }
  ): Promise<SpriteSheetData>;
  export { packSpriteSheet };
};
