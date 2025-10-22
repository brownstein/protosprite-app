import ProtoSprite, { ProtoSpriteSheet } from "protosprite-core/dist/src/core";
import { ProtoSpriteSheetThree, ProtoSpriteThree } from "protosprite-three";
import { create } from "zustand";

export type ProtospriteSourceFile = {
  type: "protosprite";
  nativePath: string;
  rawData: Uint8Array;
};

export type AsepriteSourceFile = {
  type: "aseprite";
  nativePath: string;
};

export type SourceFile = ProtospriteSourceFile | AsepriteSourceFile;

export type SpriteStoreData = {
  sourceFile?: SourceFile;
  currentSheet?: ProtoSpriteSheet;
  currentSprite?: ProtoSprite;
  currentSheetThree?: ProtoSpriteSheetThree;
  currentSpriteThree?: ProtoSpriteThree;
  updateSourceFile: (sourceFile: SourceFile | null) => void;
  updateCurrentSheet: (sheet?: ProtoSpriteSheet | null) => void;
  updateCurrentSprite: (sprite?: ProtoSprite | null) => void;
  updateCurrentSheetThree: (sheetThree: ProtoSpriteSheetThree | null) => void;
  updateCurrentSpriteThree: (spriteThree: ProtoSpriteThree | null) => void;
};

export const initialSpriteStoreData: Partial<SpriteStoreData> = {};

export const useSpriteStore = create<SpriteStoreData>()((set) => ({
  ...initialSpriteStoreData,
  updateSourceFile: (sourceFile) =>
    set((state) => ({ ...state, sourceFile: sourceFile ?? undefined })),
  updateCurrentSheet: (sheet) =>
    set((state) => ({ ...state, currentSheet: sheet ?? undefined })),
  updateCurrentSprite: (sprite) =>
    set((state) => ({ ...state, currentSprite: sprite ?? undefined })),
  updateCurrentSheetThree: (sheet) =>
    set((state) => ({ ...state, currentSheetThree: sheet ?? undefined })),
  updateCurrentSpriteThree: (sprite) =>
    set((state) => ({ ...state, currentSpriteThree: sprite ?? undefined })),
}));
