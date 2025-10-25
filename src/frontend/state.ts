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
  protosprite: {
    rawData: Uint8Array;
  };
};

export type SourceFile = ProtospriteSourceFile | AsepriteSourceFile;

export type TabName = "layers" | "animations" | "processing" | "file";

export type SpriteWithData = {
  sheet: ProtoSpriteSheet;
  sprite: ProtoSprite;
  sheetThree: ProtoSpriteSheetThree;
  spriteThree: ProtoSpriteThree;
};

export type SpriteStoreData = {
  sourceFile?: SourceFile;
  currentTab: TabName;
  baseSprite?: SpriteWithData;
  currentSprite?: SpriteWithData;
  currentAnimationName?: string;
  currentFrame?: number;
  selectedLayerNames?: Set<string>;
  visibleLayerNames?: Set<string>;
  onAfterLoad: (updates: {
    sourceFile: SourceFile;
    sprite: SpriteWithData;
  }) => void;
  setCurrentTab: (tab: TabName) => void;
  toggleAllLayersSelected: () => void;
  toggleLayerSelected: (layerName: string) => void;
  toggleLayerVisible: (layerName: string) => void;
  toggleAnimationSelected: (animationName: string) => void;
  setCurrentFrame: (frame: number) => void;
};

export const initialSpriteStoreData: Partial<SpriteStoreData> &
  Pick<SpriteStoreData, "currentTab"> = {
  currentTab: "layers",
};

export const useSpriteStore = create<SpriteStoreData>()((set) => ({
  ...initialSpriteStoreData,
  onAfterLoad: (updates) =>
    set((state) => ({
      ...state,
      sourceFile: updates.sourceFile,
      baseSprite: updates.sprite,
      currentSprite: updates.sprite
    })),
  setCurrentTab: (currentTab) =>
    set((state) => ({
      ...state,
      currentTab,
    })),
  toggleAllLayersSelected: () =>
    set((state) => {
      const allSelected =
        state.selectedLayerNames?.size === state.currentSprite?.sprite?.countLayers();
      if (allSelected) {
        return {
          ...state,
          selectedLayerNames: new Set(),
        };
      }
      return {
        ...state,
        selectedLayerNames: new Set(
          state.currentSprite?.sprite?.data.layers.map((layer) => layer.name),
        ),
      };
    }),
  toggleLayerSelected: (layerName) =>
    set((state) => {
      if (!state.currentSprite) return state;
      const selectedLayerNames = state.selectedLayerNames
        ? new Set(state.selectedLayerNames)
        : new Set<string>();
      if (selectedLayerNames.has(layerName)) {
        selectedLayerNames.delete(layerName);
      } else {
        selectedLayerNames.add(layerName);
      }
      return {
        ...state,
        selectedLayerNames,
      };
    }),
  toggleLayerVisible: (layerName) =>
    set((state) => {
      if (!state.currentSprite) return state;
      const visibleLayerNames = state.visibleLayerNames
        ? new Set(state.visibleLayerNames)
        : new Set<string>(state.currentSprite.sprite.data.layers.map((l) => l.name));
      if (visibleLayerNames.has(layerName)) {
        visibleLayerNames.delete(layerName);
        state.currentSprite?.spriteThree.hideLayers(layerName);
      } else {
        visibleLayerNames.add(layerName);
        state.currentSprite.spriteThree.showLayers(layerName);
      }
      return {
        ...state,
        visibleLayerNames,
      };
    }),
  toggleAnimationSelected: (animationName) =>
    set((state) => {
      if (!state.currentSprite?.spriteThree) return state;
      let currentAnimationName: string | null = animationName;
      if (state.currentAnimationName === currentAnimationName) {
        currentAnimationName = null;
      }
      state.currentSprite.spriteThree.gotoAnimation(currentAnimationName);
      return {
        ...state,
        currentAnimationName: currentAnimationName ?? undefined,
      };
    }),
  setCurrentFrame: (frame) =>
    set((state) => ({
      ...state,
      currentFrame: frame,
    })),
}));
