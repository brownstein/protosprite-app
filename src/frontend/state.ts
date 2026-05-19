import ProtoSprite, { ProtoSpriteSheet } from "protosprite-core";
import { ProtoSpriteSheetThree, ProtoSpriteThree } from "protosprite-three";
import {
  mergeLayerDownData,
  remappedFrameLayer,
} from "./processing/mergeLayers";
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

export type SpriteWithData = {
  sheet: ProtoSpriteSheet;
  sprite: ProtoSprite;
  sheetThree: ProtoSpriteSheetThree;
  spriteThree: ProtoSpriteThree;
};

export type SpriteStoreData = {
  sourceFile?: SourceFile;
  baseSprite?: SpriteWithData;
  currentSprite?: SpriteWithData;
  currentAnimationName?: string;
  currentFrame?: number;
  // Whether animation playback is advancing (false = paused/scrubbing).
  playing: boolean;
  selectedLayerNames?: Set<string>;
  visibleLayerNames?: Set<string>;
  modifiers: ProcessingStep[];
  onAfterLoad: (updates: {
    sourceFile: SourceFile;
    sprite: SpriteWithData;
  }) => void;
  toggleAllLayersSelected: () => void;
  toggleLayerSelected: (layerName: string) => void;
  toggleLayerVisible: (layerName: string) => void;
  setAnimation: (animationName: string | null) => void;
  setPlaying: (playing: boolean) => void;
  gotoFrame: (frame: number) => void;
  setCurrentFrame: (frame: number) => void;
  pushModifier: (modifier: ProcessingStep) => void;
  updateModifier: (index: number, modifier: ProcessingStep) => void;
  removeModifier: (index: number) => void;
  // Index of the palette modifier currently waiting for an eyedropper pick
  // from the sprite preview (null when not picking).
  eyedropperModifierIndex?: number | null;
  beginEyedropper: (index: number) => void;
  cancelEyedropper: () => void;
  applyEyedropperColor: (hex: string) => void;
  renameLayer: (oldName: string, newName: string) => void;
  // Reorders a layer by `direction` (-1 up / +1 down) in the base sprite,
  // remapping every frame-layer/parent index and the per-layer draw index.
  moveLayer: (name: string, direction: number) => void;
  // Flattens `name` into the layer directly below it, removing the upper
  // layer, then rebuilds + recomputes the base sprite.
  mergeLayerDown: (name: string) => void;
  // Removes the layer `name` (and its frame-layers) from the base sprite,
  // reindexes, then recomputes.
  deleteLayer: (name: string) => void;
  // Bakes the pipeline up to and including the modifier at `index` into the
  // base sprite, then drops those (now-permanent) steps so the result
  // persists independently of the modifier list.
  applyModifier: (index: number) => void;
};

export const initialSpriteStoreData: Partial<SpriteStoreData> &
  Pick<SpriteStoreData, "modifiers"> = {
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
  const sprite = threeData.spriteThree.data.sprite;
  // Default any newly-created layers (e.g. from a palette split) to visible
  // so they aren't accidentally hidden once the visibility set exists.
  const { visibleLayerNames } = useSpriteStore.getState();
  let nextVisible = visibleLayerNames;
  if (visibleLayerNames) {
    nextVisible = new Set(visibleLayerNames);
    for (const layer of sprite.data.layers) {
      if (!visibleLayerNames.has(layer.name)) nextVisible.add(layer.name);
    }
  }
  useSpriteStore.setState({
    currentSprite: {
      sprite,
      spriteThree: threeData.spriteThree,
      sheet: threeData.sheetThree.sheet,
      sheetThree: threeData.sheetThree,
    },
    visibleLayerNames: nextVisible,
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
  eyedropperModifierIndex: null,
  playing: true,
  onAfterLoad: (updates) => {
    recomputeGeneration++;
    set(() => ({
      sourceFile: updates.sourceFile,
      baseSprite: updates.sprite,
      currentSprite: updates.sprite,
      modifiers: [],
      eyedropperModifierIndex: null,
    }));
  },
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
  setAnimation: (animationName) =>
    set((state) => {
      if (!state.currentSprite?.spriteThree) return state;
      state.currentSprite.spriteThree.gotoAnimation(animationName);
      return {
        currentAnimationName: animationName ?? undefined,
        playing: true,
      };
    }),
  setPlaying: (playing) => set(() => ({ playing })),
  gotoFrame: (frame) =>
    set((state) => {
      const spriteThree = state.currentSprite?.spriteThree;
      if (!spriteThree) return state;
      spriteThree.gotoFrame(frame);
      spriteThree.update();
      return { currentFrame: frame, playing: false };
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
  beginEyedropper: (index) =>
    set(() => ({ eyedropperModifierIndex: index })),
  cancelEyedropper: () => set(() => ({ eyedropperModifierIndex: null })),
  applyModifier: async (index) => {
    const state = useSpriteStore.getState();
    const baseSprite = state.baseSprite;
    if (!baseSprite) return;
    const stepsSnapshot = state.modifiers;
    const target = stepsSnapshot[index];
    if (!target) return;
    // Bake everything up to and including this step (later steps may depend
    // on the pipeline output at this position).
    const stepsToBake = stepsSnapshot.slice(0, index + 1);
    const baked = await processDataSteps(
      {
        sheet: baseSprite.sheet.data,
        sprite: baseSprite.sprite.data,
      },
      stepsToBake,
    );
    // Abort if the pipeline changed while we worked, or the bake failed.
    if (useSpriteStore.getState().modifiers !== stepsSnapshot || !baked) {
      return;
    }
    const three = await produceProtoSpriteThree(baked);
    if (useSpriteStore.getState().modifiers !== stepsSnapshot || !three) {
      return;
    }
    // Supersede any in-flight recompute that still reads the old base.
    recomputeGeneration++;
    set((s) => ({
      baseSprite: {
        sprite: three.spriteThree.data.sprite,
        spriteThree: three.spriteThree,
        sheet: three.sheetThree.sheet,
        sheetThree: three.sheetThree,
      },
      modifiers: s.modifiers.slice(index + 1),
      eyedropperModifierIndex: null,
    }));
    scheduleRecompute();
  },
  moveLayer: async (name, direction) => {
    const baseSprite = useSpriteStore.getState().baseSprite;
    if (!baseSprite) return;
    const sprite = baseSprite.sprite.data.clone();
    const layers = sprite.layers;
    const from = layers.findIndex((l) => l.name === name);
    if (from < 0) return;
    const to = from + (direction < 0 ? -1 : 1);
    if (to < 0 || to >= layers.length) return;
    [layers[from], layers[to]] = [layers[to], layers[from]];
    // Frame-layers and parentIndex reference layers by array position; only
    // the two swapped slots move.
    const remap = (i: number) => (i === from ? to : i === to ? from : i);
    for (let p = 0; p < layers.length; p++) {
      // Draw order is layer.index * 0.05, so make it follow array order.
      layers[p].index = p;
      const parent = layers[p].parentIndex;
      if (parent !== undefined) layers[p].parentIndex = remap(parent);
    }
    for (const frame of sprite.frames) {
      for (const fl of frame.layers) {
        const r = remappedFrameLayer(fl.layerIndex, fl.zIndex, remap);
        fl.layerIndex = r.layerIndex;
        fl.zIndex = r.zIndex;
      }
    }
    const sheet = baseSprite.sheet.data.clone();
    sheet.sprites[0] = sprite;
    const three = await produceProtoSpriteThree({ sheet, sprite });
    if (!three) return;
    recomputeGeneration++;
    set(() => ({
      baseSprite: {
        sprite: three.spriteThree.data.sprite,
        spriteThree: three.spriteThree,
        sheet: three.sheetThree.sheet,
        sheetThree: three.sheetThree,
      },
    }));
    scheduleRecompute();
  },
  mergeLayerDown: async (name) => {
    const baseSprite = useSpriteStore.getState().baseSprite;
    if (!baseSprite) return;
    const merged = await mergeLayerDownData(
      baseSprite.sheet.data,
      baseSprite.sprite.data,
      name,
    );
    if (!merged) return;
    const three = await produceProtoSpriteThree(merged);
    if (!three) return;
    recomputeGeneration++;
    set(() => ({
      baseSprite: {
        sprite: three.spriteThree.data.sprite,
        spriteThree: three.spriteThree,
        sheet: three.sheetThree.sheet,
        sheetThree: three.sheetThree,
      },
    }));
    scheduleRecompute();
  },
  deleteLayer: async (name) => {
    const baseSprite = useSpriteStore.getState().baseSprite;
    if (!baseSprite) return;
    const sprite = baseSprite.sprite.data.clone();
    const layers = sprite.layers;
    if (layers.length <= 1) return;
    const di = layers.findIndex((l) => l.name === name);
    if (di < 0) return;
    layers.splice(di, 1);
    const remap = (i: number) => (i > di ? i - 1 : i);
    for (let p = 0; p < layers.length; p++) {
      layers[p].index = p;
      const parent = layers[p].parentIndex;
      layers[p].parentIndex =
        parent === undefined || parent === di ? undefined : remap(parent);
    }
    for (const frame of sprite.frames) {
      frame.layers = frame.layers.filter((fl) => fl.layerIndex !== di);
      for (const fl of frame.layers) {
        const r = remappedFrameLayer(fl.layerIndex, fl.zIndex, remap);
        fl.layerIndex = r.layerIndex;
        fl.zIndex = r.zIndex;
      }
    }
    const sheet = baseSprite.sheet.data.clone();
    sheet.sprites[0] = sprite;
    const three = await produceProtoSpriteThree({ sheet, sprite });
    if (!three) return;
    recomputeGeneration++;
    set(() => ({
      baseSprite: {
        sprite: three.spriteThree.data.sprite,
        spriteThree: three.spriteThree,
        sheet: three.sheetThree.sheet,
        sheetThree: three.sheetThree,
      },
    }));
    scheduleRecompute();
  },
  renameLayer: (oldName, newName) => {
    const next = newName.trim();
    const state = useSpriteStore.getState();
    if (!next || next === oldName) return;
    // Reject collisions against the currently-visible layer set.
    const existing = new Set(
      state.currentSprite?.sprite.data.layers.map((l) => l.name) ?? [],
    );
    if (existing.has(next)) return;

    // Rename in the base sprite (source of truth that modifiers replay from).
    const renameInLayers = (layers?: { name: string }[]) => {
      if (!layers) return;
      for (const l of layers) if (l.name === oldName) l.name = next;
    };
    if (state.baseSprite) {
      renameInLayers(state.baseSprite.sprite.data.layers);
      renameInLayers(state.baseSprite.sheet.data.sprites?.[0]?.layers);
    }

    // Propagate to modifier source refs and palette destination names.
    const modifiers: ProcessingStep[] = state.modifiers.map((m) => {
      if (m.type === "hsv") {
        return m.layerNames.includes(oldName)
          ? {
              ...m,
              layerNames: m.layerNames.map((n) =>
                n === oldName ? next : n,
              ),
            }
          : m;
      }
      if (m.type === "palette") {
        return {
          ...m,
          layerNames: m.layerNames.map((n) => (n === oldName ? next : n)),
          newLayerName: m.newLayerName === oldName ? next : m.newLayerName,
        };
      }
      return m;
    });

    const renameInSet = (s?: Set<string>) => {
      if (!s || !s.has(oldName)) return s;
      const renamed = new Set(s);
      renamed.delete(oldName);
      renamed.add(next);
      return renamed;
    };

    set((s) => ({
      modifiers,
      selectedLayerNames: renameInSet(s.selectedLayerNames),
      visibleLayerNames: renameInSet(s.visibleLayerNames),
    }));
    scheduleRecompute();
  },
  applyEyedropperColor: (hex) => {
    const state = useSpriteStore.getState();
    const index = state.eyedropperModifierIndex;
    if (index == null) return;
    const target = state.modifiers[index];
    if (!target || target.type !== "palette") {
      set(() => ({ eyedropperModifierIndex: null }));
      return;
    }
    const targetColors = target.targetColors.includes(hex)
      ? target.targetColors
      : [...target.targetColors, hex];
    set((s) => ({
      modifiers: [
        ...s.modifiers.slice(0, index),
        { ...target, targetColors },
        ...s.modifiers.slice(index + 1),
      ],
      eyedropperModifierIndex: null,
    }));
    scheduleRecompute();
  },
}));
