import ProtoSprite, { ProtoSpriteSheet } from "protosprite-core";
import { ProtoSpriteSheetThree, ProtoSpriteThree } from "protosprite-three";
import { create } from "zustand";
import { ProcessingStep } from "./processing/systemTypes";
import { processDataSteps, produceProtoSpriteThree } from "./processing/system";

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

export type TabName = "layers" | "animations" | "file";

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
  modifiers: ProcessingStep[];
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
  pushModifier: (modifier: ProcessingStep) => void;
  updateModifier: (index: number, modifier: ProcessingStep) => void;
  removeModifier: (index: number) => void;
};

export const initialSpriteStoreData: Partial<SpriteStoreData> &
  Pick<SpriteStoreData, "currentTab" | "modifiers"> = {
  currentTab: "layers",
  modifiers: [],
};

export const useSpriteStore = create<SpriteStoreData>()((set, get) => ({
  ...initialSpriteStoreData,
  onAfterLoad: (updates) =>
    set(() => ({
      sourceFile: updates.sourceFile,
      baseSprite: updates.sprite,
      currentSprite: updates.sprite,
      modifiers: []
    })),
  setCurrentTab: (currentTab) =>
    set(() => ({
      currentTab,
    })),
  toggleAllLayersSelected: () =>
    set((state) => {
      const allSelected =
        state.selectedLayerNames?.size ===
        state.currentSprite?.sprite?.countLayers();
      if (allSelected) {
        return {
          ...state,
          selectedLayerNames: new Set(),
        };
      }
      return {
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
        selectedLayerNames,
      };
    }),
  toggleLayerVisible: (layerName) =>
    set((state) => {
      if (!state.currentSprite) return state;
      const visibleLayerNames = state.visibleLayerNames
        ? new Set(state.visibleLayerNames)
        : new Set<string>(
            state.currentSprite.sprite.data.layers.map((l) => l.name),
          );
      if (visibleLayerNames.has(layerName)) {
        visibleLayerNames.delete(layerName);
        state.currentSprite?.spriteThree.hideLayers(layerName);
      } else {
        visibleLayerNames.add(layerName);
        state.currentSprite.spriteThree.showLayers(layerName);
      }
      return {
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
        currentAnimationName: currentAnimationName ?? undefined,
      };
    }),
  setCurrentFrame: (frame) =>
    set(() => ({
      currentFrame: frame,
    })),
  // TODO: refactor duplicate async logic.
  pushModifier: async (modifier) => {
    const currentState = get();
    const modifiers = [...currentState.modifiers, modifier];
    set(() => ({ modifiers }));
    if (!currentState.baseSprite) return;
    const updatedData = await processDataSteps(
      {
        sheet: currentState.baseSprite.sheet.data,
        sprite: currentState.baseSprite.sprite.data,
      },
      modifiers,
    );
    if (get().modifiers !== modifiers || !updatedData) return;
    const threeData = await produceProtoSpriteThree(updatedData);
    if (get().modifiers !== modifiers || !threeData) return;
    set(() => ({
      currentSprite: {
        sprite: threeData.spriteThree.data.sprite,
        spriteThree: threeData.spriteThree,
        sheet: threeData.sheetThree.sheet,
        sheetThree: threeData.sheetThree,
      },
    }));
  },
  // TODO: refactor duplicate async logic.
  updateModifier: async (index, modifier) => {
    const currentState = get();
    const modifiers = [
      ...currentState.modifiers.slice(0, index),
      modifier,
      ...currentState.modifiers.slice(index + 1),
    ];
    set(() => ({ modifiers }));
    if (!currentState.baseSprite) return;
    const updatedData = await processDataSteps(
      {
        sheet: currentState.baseSprite.sheet.data,
        sprite: currentState.baseSprite.sprite.data,
      },
      modifiers,
    );
    if (get().modifiers !== modifiers || !updatedData) return;
    const threeData = await produceProtoSpriteThree(updatedData);
    if (get().modifiers !== modifiers || !threeData) return;
    set(() => ({
      currentSprite: {
        sprite: threeData.spriteThree.data.sprite,
        spriteThree: threeData.spriteThree,
        sheet: threeData.sheetThree.sheet,
        sheetThree: threeData.sheetThree,
      },
    }));
  },
  // TODO: refactor duplicate async logic.
  removeModifier: async (index) => {
    const currentState = get();
    const modifiers = [
      ...currentState.modifiers.slice(0, index),
      ...currentState.modifiers.slice(index + 1),
    ];
    set(() => ({ modifiers }));
    if (!currentState.baseSprite) return;
    const updatedData = await processDataSteps(
      {
        sheet: currentState.baseSprite.sheet.data,
        sprite: currentState.baseSprite.sprite.data,
      },
      modifiers,
    );
    if (get().modifiers !== modifiers || !updatedData) return;
    const threeData = await produceProtoSpriteThree(updatedData);
    if (get().modifiers !== modifiers || !threeData) return;
    set(() => ({
      currentSprite: {
        sprite: threeData.spriteThree.data.sprite,
        spriteThree: threeData.spriteThree,
        sheet: threeData.sheetThree.sheet,
        sheetThree: threeData.sheetThree,
      },
    }));
  },
}));
