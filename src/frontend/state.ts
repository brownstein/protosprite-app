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

export type TabName = "layers" | "animations";

export type SpriteStoreData = {
  sourceFile?: SourceFile;
  currentTab: TabName;
  currentSheet?: ProtoSpriteSheet;
  currentSprite?: ProtoSprite;
  currentSheetThree?: ProtoSpriteSheetThree;
  currentSpriteThree?: ProtoSpriteThree;
  visibleLayerNames?: Set<string>;
  currentAnimationName?: string;
  onAfterLoad: (updates: {
    sourceFile: SourceFile;
    currentSheet: ProtoSpriteSheet;
    currentSprite: ProtoSprite;
    currentSheetThree: ProtoSpriteSheetThree;
    currentSpriteThree: ProtoSpriteThree;
  }) => void;
  setCurrentTab: (tab: TabName) => void;
  toggleLayer: (layerName: string) => void;
  toggleAnimationSelected: (animationName: string) => void;
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
      ...updates,
    })),
  setCurrentTab: (currentTab) =>
    set((state) => ({
      ...state,
      currentTab,
    })),
  toggleLayer: (layerName) =>
    set((state) => {
      if (!state.currentSprite) return state;
      const visibleLayerNames = state.visibleLayerNames
        ? new Set(state.visibleLayerNames)
        : new Set<string>(state.currentSprite.data.layers.map((l) => l.name));
      if (visibleLayerNames.has(layerName)) {
        visibleLayerNames.delete(layerName);
        state.currentSpriteThree?.hideLayers(layerName);
      } else {
        visibleLayerNames.add(layerName);
        state.currentSpriteThree?.showLayers(layerName);
      }
      return {
        ...state,
        visibleLayerNames,
      };
    }),
    toggleAnimationSelected: (animationName) => set((state) => {
      if (!state.currentSpriteThree) return state;
      let currentAnimationName: string | null = animationName;
      if (state.currentAnimationName === currentAnimationName) {
        currentAnimationName = null;
      }
      state.currentSpriteThree.gotoAnimation(currentAnimationName);
      return {
        ...state,
        currentAnimationName: currentAnimationName ?? undefined
      };
    })
}));
