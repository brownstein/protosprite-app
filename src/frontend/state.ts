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

export type SpriteStoreData = {
  sourceFile?: SourceFile;
  currentTab: TabName;
  currentSheet?: ProtoSpriteSheet;
  currentSprite?: ProtoSprite;
  currentSheetThree?: ProtoSpriteSheetThree;
  currentSpriteThree?: ProtoSpriteThree;
  selectedLayerNames?: Set<string>;
  visibleLayerNames?: Set<string>;
  currentAnimationName?: string;
  currentFrame?: number;
  onAfterLoad: (updates: {
    sourceFile: SourceFile;
    currentSheet: ProtoSpriteSheet;
    currentSprite: ProtoSprite;
    currentSheetThree: ProtoSpriteSheetThree;
    currentSpriteThree: ProtoSpriteThree;
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
      ...updates,
    })),
  setCurrentTab: (currentTab) =>
    set((state) => ({
      ...state,
      currentTab,
    })),
  toggleAllLayersSelected: () =>
    set((state) => {
      const allSelected =
        state.selectedLayerNames?.size === state.currentSprite?.countLayers();
      if (allSelected) {
        return {
          ...state,
          selectedLayerNames: new Set(),
        };
      }
      return {
        ...state,
        selectedLayerNames: new Set(
          state.currentSprite?.data.layers.map((layer) => layer.name),
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
  toggleAnimationSelected: (animationName) =>
    set((state) => {
      if (!state.currentSpriteThree) return state;
      let currentAnimationName: string | null = animationName;
      if (state.currentAnimationName === currentAnimationName) {
        currentAnimationName = null;
      }
      state.currentSpriteThree.gotoAnimation(currentAnimationName);
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
