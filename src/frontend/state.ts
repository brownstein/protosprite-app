import ProtoSprite, { ProtoSpriteSheet } from "protosprite-core";
import { ProtoSpriteSheetThree, ProtoSpriteThree } from "protosprite-three";
import { processDataSteps, produceProtoSpriteThree } from "./processing/system";
import { ProcessingStep } from "./processing/systemTypes";
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

let recomputeGeneration = 0;
let activeRun: Promise<void> | null = null;
let recomputeDirty = false;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function recomputeFromBase(generation: number) {
  const { baseSprite, modifiers } = useSpriteStore.getState();
  if (!baseSprite) return;
  const updatedData = await processDataSteps(
    {
      sheet: baseSprite.sheet.data,
      sprite: baseSprite.sprite.data,
    },
    modifiers,
  );
  if (generation !== recomputeGeneration || !updatedData) return;
  const threeData = await produceProtoSpriteThree(updatedData);
  if (generation !== recomputeGeneration || !threeData) return;
  useSpriteStore.setState({
    currentSprite: {
      sprite: threeData.spriteThree.data.sprite,
      spriteThree: threeData.spriteThree,
      sheet: threeData.sheetThree.sheet,
      sheetThree: threeData.sheetThree,
    },
  });
}

// Debounce/serialize recomputes: only one runs at a time. When new changes
// arrive while a recompute is in flight, wait for it to finish OR one second
// (whichever comes first) before starting the next recompute from the latest
// modifiers. The generation guard discards results from superseded runs.
function scheduleRecompute() {
  recomputeDirty = true;
  if (activeRun) return;
  activeRun = (async () => {
    try {
      while (recomputeDirty) {
        recomputeDirty = false;
        const generation = ++recomputeGeneration;
        await Promise.race([recomputeFromBase(generation), sleep(1000)]);
      }
    } finally {
      activeRun = null;
    }
  })();
}

export const useSpriteStore = create<SpriteStoreData>()((set) => ({
  ...initialSpriteStoreData,
  onAfterLoad: (updates) => {
    recomputeGeneration++;
    set(() => ({
      sourceFile: updates.sourceFile,
      baseSprite: updates.sprite,
      currentSprite: updates.sprite,
      modifiers: [],
    }));
  },
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
  pushModifier: (modifier) => {
    set((state) => ({ modifiers: [...state.modifiers, modifier] }));
    scheduleRecompute();
  },
  updateModifier: (index, modifier) => {
    set((state) => ({
      modifiers: [
        ...state.modifiers.slice(0, index),
        modifier,
        ...state.modifiers.slice(index + 1),
      ],
    }));
    scheduleRecompute();
  },
  removeModifier: (index) => {
    set((state) => ({
      modifiers: [
        ...state.modifiers.slice(0, index),
        ...state.modifiers.slice(index + 1),
      ],
    }));
    scheduleRecompute();
  },
}));
