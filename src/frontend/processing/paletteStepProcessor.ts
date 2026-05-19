import {
  JimpData,
  getJimpData,
  getUniqueLayerRegions,
  parseHexColor,
  regionKey,
  setJimpData,
} from "./adjustColor";
import { PaletteProcessingStep, StepData, StepProcessor } from "./systemTypes";
import { Data } from "protosprite-core";
import { Jimp } from "jimp";
import { remappedFrameLayer } from "./mergeLayers";

const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3);

type AppendedRegion = { x: number; y: number; w: number; h: number };

// Splits pixels within `tolerance` of ANY `targetColors` (across the source
// `layerNames`) out of their source layers into new layer(s). Matched pixels
// are MOVED: cleared from the source and written into freshly appended,
// always-zeroed atlas regions (the original atlas area is never re-blitted).
//
// splitPerLayer=false: one combined layer (`newLayerName`) appended at the end.
// splitPerLayer=true:  one layer per source layer, each inserted directly
// after its source layer; all frame-layer/parent indices and zIndex offsets
// are remapped so existing draw order is preserved across the insertions.
export const PaletteStepProcessor: StepProcessor<PaletteProcessingStep> = {
  type: "palette",
  applyStep: async (data: StepData, step: PaletteProcessingStep) => {
    if (
      step.layerNames.length === 0 ||
      !step.newLayerName ||
      step.targetColors.length === 0
    ) {
      return data;
    }

    const sheetClone = data.sheet.clone();
    const spriteClone = data.sprite.clone();
    sheetClone.sprites[0] = spriteClone;

    const oldLayers = spriteClone.layers;
    if (oldLayers.length === 0) return data;

    const sourceNameSet = new Set(
      step.layerNames.filter((n) => oldLayers.some((l) => l.name === n)),
    );
    if (sourceNameSet.size === 0) return data;
    const splitPerLayer = step.splitPerLayer && sourceNameSet.size >= 1;

    const img = await getJimpData(sheetClone, spriteClone);
    if (!img) return null;
    const targets = step.targetColors.map(parseHexColor);
    const threshold =
      (Math.max(0, Math.min(100, step.tolerance)) / 100) * MAX_RGB_DISTANCE;
    const thresholdSq = threshold * threshold;
    const width = img.bitmap.width;
    const height = img.bitmap.height;
    const src = img.bitmap.data;

    // Destination = a new layer fed by one or more source layers. destId keys
    // the appended-region map; "" is the single combined destination.
    const destIds = splitPerLayer ? [...sourceNameSet] : [""];
    const destSources = (destId: string) =>
      destId === "" ? [...sourceNameSet] : [destId];

    // Allocate one fresh appended region per (destination, unique region),
    // stacked in a column below the original atlas.
    const appended = new Map<string, AppendedRegion>();
    const jobs: { destId: string; region: AppendedRegion }[] = [];
    let offsetY = height;
    for (const destId of destIds) {
      for (const [pos, size] of getUniqueLayerRegions(
        spriteClone,
        destSources(destId),
      )) {
        const key = `${destId}:${regionKey(pos, size)}`;
        if (appended.has(key)) continue;
        const region: AppendedRegion = {
          x: 0,
          y: offsetY,
          w: size.width,
          h: size.height,
        };
        appended.set(key, region);
        jobs.push({ destId, region });
        offsetY += size.height;
      }
    }
    const newHeight = offsetY;

    // Fresh, fully-zeroed canvas (the Buffer global is not polyfilled for app
    // code in the renderer bundle, so allocate via Jimp).
    const out = new Jimp({ width, height: newHeight, color: 0x00000000 });
    const dst = out.bitmap.data;
    // Copy only the original atlas rows; appended rows stay zeroed and are
    // never the original image, so existing content is never re-blitted.
    dst.set(src.subarray(0, width * height * 4), 0);

    // Explicitly zero every appended region before writing into it.
    for (const { region } of jobs) {
      for (let dy = 0; dy < region.h; dy++) {
        const rowStart = ((region.y + dy) * width + region.x) * 4;
        dst.fill(0, rowStart, rowStart + region.w * 4);
      }
    }

    const matches = (r: number, g: number, b: number) => {
      for (const t of targets) {
        const dr = r - t.r;
        const dg = g - t.g;
        const db = b - t.b;
        if (dr * dr + dg * dg + db * db <= thresholdSq) return true;
      }
      return false;
    };

    for (const destId of destIds) {
      for (const [pos, size] of getUniqueLayerRegions(
        spriteClone,
        destSources(destId),
      )) {
        const region = appended.get(`${destId}:${regionKey(pos, size)}`);
        if (!region) continue;
        for (let dy = 0; dy < size.height; dy++) {
          for (let dx = 0; dx < size.width; dx++) {
            const sx = pos.x + dx;
            const sy = pos.y + dy;
            if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
            const sIdx = (sy * width + sx) * 4;
            const a = src[sIdx + 3];
            if (a === 0) continue;
            const r = src[sIdx];
            const g = src[sIdx + 1];
            const b = src[sIdx + 2];
            if (!matches(r, g, b)) continue;
            const nIdx = ((region.y + dy) * width + (region.x + dx)) * 4;
            dst[nIdx] = r;
            dst[nIdx + 1] = g;
            dst[nIdx + 2] = b;
            dst[nIdx + 3] = a;
            // Move (not copy): clear from the source atlas region.
            dst[sIdx] = 0;
            dst[sIdx + 1] = 0;
            dst[sIdx + 2] = 0;
            dst[sIdx + 3] = 0;
          }
        }
      }
    }

    // Build the new layer array. Insert each split layer right after its
    // source layer (or one combined layer at the end).
    const usedNames = new Set(oldLayers.map((l) => l.name));
    const uniqueName = (base: string) => {
      let name = base;
      let n = 2;
      while (usedNames.has(name)) name = `${base} ${n++}`;
      usedNames.add(name);
      return name;
    };
    const sourceOldPositions: number[] = [];
    oldLayers.forEach((l, p) => {
      if (splitPerLayer && sourceNameSet.has(l.name)) sourceOldPositions.push(p);
    });
    // Monotonic old-slot -> new-slot map for the insertions.
    const slotRemap = (s: number) =>
      s + sourceOldPositions.filter((q) => q < s).length;

    const newLayers: Data.LayerData[] = [];
    // destId -> new array position of its layer.
    const destNewPos = new Map<string, number>();
    for (const layer of oldLayers) {
      newLayers.push(layer);
      if (splitPerLayer && sourceNameSet.has(layer.name)) {
        const ns = layer.clone();
        ns.name = uniqueName(`${layer.name} ${step.newLayerName}`);
        ns.isGroup = false;
        ns.parentIndex = undefined;
        destNewPos.set(layer.name, newLayers.length);
        newLayers.push(ns);
      }
    }
    if (!splitPerLayer) {
      const ns = oldLayers[0].clone();
      ns.name = uniqueName(step.newLayerName);
      ns.isGroup = false;
      ns.parentIndex = undefined;
      destNewPos.set("", newLayers.length);
      newLayers.push(ns);
    }

    // Remap original layers' parent indices, then renumber every layer's
    // draw index to its new array position.
    for (const layer of oldLayers) {
      if (layer.parentIndex !== undefined) {
        layer.parentIndex = slotRemap(layer.parentIndex);
      }
    }
    spriteClone.layers = newLayers;
    newLayers.forEach((l, np) => {
      l.index = np;
    });

    const destOf = (layerName: string) =>
      splitPerLayer ? layerName : sourceNameSet.has(layerName) ? "" : null;

    for (const frame of spriteClone.frames) {
      const additions: Data.FrameLayerData[] = [];
      const seen = new Set<string>();
      for (const fl of frame.layers) {
        const oldLayer = oldLayers[fl.layerIndex];
        if (!oldLayer || !sourceNameSet.has(oldLayer.name)) continue;
        const destId = destOf(oldLayer.name);
        if (destId === null) continue;
        const rk = regionKey(fl.sheetPosition, fl.size);
        const region = appended.get(`${destId}:${rk}`);
        const nsPos = destNewPos.get(destId);
        if (!region || nsPos === undefined) continue;
        const dedupe = `${destId}:${rk}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        const mirror = fl.clone();
        mirror.layerIndex = nsPos;
        mirror.zIndex = 0;
        mirror.sheetPosition.x = region.x;
        mirror.sheetPosition.y = region.y;
        additions.push(mirror);
      }
      for (const fl of frame.layers) {
        const r = remappedFrameLayer(fl.layerIndex, fl.zIndex, slotRemap);
        fl.layerIndex = r.layerIndex;
        fl.zIndex = r.zIndex;
      }
      frame.layers.push(...additions);
    }

    // jimp's constructed-instance type and Jimp.read's return type are
    // self-inconsistent in its .d.ts; the value is a real Jimp instance.
    return (await setJimpData(sheetClone, spriteClone, out as unknown as JimpData))
      ? { sheet: sheetClone, sprite: spriteClone }
      : null;
  },
};
