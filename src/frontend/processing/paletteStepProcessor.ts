import { PaletteProcessingStep, StepData, StepProcessor } from "./systemTypes";
import {
  getJimpData,
  getUniqueLayerRegions,
  parseHexColor,
  regionKey,
  setJimpData,
} from "./adjustColor";
import { Data } from "protosprite-core";

const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3);

// Splits pixels within `tolerance` of `targetColor` (across the source
// `layerNames`) out of their source layers and into a brand-new layer
// (`newLayerName`). Matched pixels are MOVED: cleared from the source and
// written into a freshly appended atlas region that the new layer's
// frame-layers point at. Region de-duplication preserves animation reuse.
export const PaletteStepProcessor: StepProcessor<PaletteProcessingStep> = {
  type: "palette",
  applyStep: async (data: StepData, step: PaletteProcessingStep) => {
    if (step.layerNames.length === 0 || !step.newLayerName) return data;

    const sheetClone = data.sheet.clone();
    const spriteClone = data.sprite.clone();
    sheetClone.sprites[0] = spriteClone;

    if (spriteClone.layers.length === 0) return data;
    // Idempotency guard: the new layer already exists, nothing to split.
    if (spriteClone.layers.some((l) => l.name === step.newLayerName)) {
      return data;
    }

    const img = await getJimpData(sheetClone, spriteClone);
    if (!img) return null;

    const target = parseHexColor(step.targetColor);
    const threshold =
      (Math.max(0, Math.min(100, step.tolerance)) / 100) * MAX_RGB_DISTANCE;
    const thresholdSq = threshold * threshold;

    const width = img.bitmap.width;
    const height = img.bitmap.height;
    const src = img.bitmap.data;

    // One appended region per unique source region, stacked in a single
    // column below the existing atlas.
    const regions = getUniqueLayerRegions(spriteClone, step.layerNames);
    const appended = new Map<string, { x: number; y: number }>();
    let offsetY = height;
    for (const [pos, size] of regions) {
      const key = regionKey(pos, size);
      if (appended.has(key)) continue;
      appended.set(key, { x: 0, y: offsetY });
      offsetY += size.height;
    }
    const newHeight = offsetY;

    const dst = Buffer.alloc(width * newHeight * 4);
    dst.set(src.subarray(0, width * height * 4), 0);

    for (const [pos, size] of regions) {
      const region = appended.get(regionKey(pos, size));
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
          const dr = r - target.r;
          const dg = g - target.g;
          const db = b - target.b;
          if (dr * dr + dg * dg + db * db > thresholdSq) continue;
          // Copy the matched pixel into the new layer's region...
          const nIdx = ((region.y + dy) * width + (region.x + dx)) * 4;
          dst[nIdx] = r;
          dst[nIdx + 1] = g;
          dst[nIdx + 2] = b;
          dst[nIdx + 3] = a;
          // ...and remove it from the source layer (move, not copy).
          dst[sIdx] = 0;
          dst[sIdx + 1] = 0;
          dst[sIdx + 2] = 0;
          dst[sIdx + 3] = 0;
        }
      }
    }

    img.bitmap.data = dst;
    img.bitmap.width = width;
    img.bitmap.height = newHeight;

    // Add the new layer at the end (existing layer indices stay valid).
    const newIndex = spriteClone.layers.length;
    const newLayer = spriteClone.layers[0].clone();
    newLayer.index = newIndex;
    newLayer.name = step.newLayerName;
    newLayer.isGroup = false;
    newLayer.parentIndex = undefined;
    spriteClone.layers.push(newLayer);

    // Mirror every source frame-layer with one for the new layer pointing at
    // the matched-pixels-only appended region.
    const sourceNames = new Set(step.layerNames);
    for (const frame of spriteClone.frames) {
      const additions: Data.FrameLayerData[] = [];
      const seen = new Set<string>();
      for (const frameLayer of frame.layers) {
        const layer = spriteClone.layers.at(frameLayer.layerIndex);
        if (!layer || !sourceNames.has(layer.name)) continue;
        const key = regionKey(frameLayer.sheetPosition, frameLayer.size);
        if (seen.has(key)) continue;
        seen.add(key);
        const region = appended.get(key);
        if (!region) continue;
        const mirror = frameLayer.clone();
        mirror.layerIndex = newIndex;
        mirror.sheetPosition.x = region.x;
        mirror.sheetPosition.y = region.y;
        additions.push(mirror);
      }
      frame.layers.push(...additions);
    }

    return (await setJimpData(sheetClone, spriteClone, img))
      ? { sheet: sheetClone, sprite: spriteClone }
      : null;
  },
};
