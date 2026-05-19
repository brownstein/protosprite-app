import Color, { ColorInstance } from "color";
import { Base64 } from "js-base64";
import { Data } from "protosprite-core";
import { Jimp } from "jimp";

export type JimpData = Awaited<ReturnType<typeof Jimp.read>>;

export function getPngData(sheetData: Data.SpriteSheetData, spriteData: Data.SpriteData) {
  let pixelSourceArr: Uint8Array | undefined;
  if (Data.isEmbeddedSpriteSheetData(spriteData.pixelSource)) {
    pixelSourceArr = spriteData.pixelSource.pngData;
  }
  // TODO(rbrownstein): update protosprite-core to explicitly surface presence of parent sheet data.
  if (Data.isEmbeddedSpriteSheetData(sheetData.pixelSource)) {
    pixelSourceArr = sheetData.pixelSource.pngData;
  }
  return pixelSourceArr ?? null;
}

export async function getJimpData(sheetData: Data.SpriteSheetData, spriteData: Data.SpriteData) {
  const pixelSourceArr = getPngData(sheetData, spriteData);
  if (!pixelSourceArr) return null;
  const stringifiedBuffer = `data:image/png;base64,${Base64.fromUint8Array(pixelSourceArr)}`;
  return Jimp.read(stringifiedBuffer, {
    "image/png": {}
  });
}

export function setPngData(sheetData: Data.SpriteSheetData, spriteData: Data.SpriteData, pngData: Uint8Array) {
  if (Data.isEmbeddedSpriteSheetData(spriteData.pixelSource)) {
    spriteData.pixelSource.pngData = pngData;
    return true;
  }
  // TODO(rbrownstein): update protosprite-core to explicitly surface presence of parent sheet data.
  if (Data.isEmbeddedSpriteSheetData(sheetData.pixelSource)) {
    sheetData.pixelSource.pngData = pngData;
    return true;
  }
  return false;
}

export async function setJimpData(sheetData: Data.SpriteSheetData, spriteData: Data.SpriteData, jimpData: JimpData) {
  const buff = await jimpData.getBuffer("image/png");
  const pngData = new Uint8Array(buff);
  return setPngData(sheetData, spriteData, buff);
}

export type RGB = { r: number; g: number; b: number };

export function parseHexColor(hex: string): RGB {
  try {
    const c = new Color(hex);
    return { r: c.red(), g: c.green(), b: c.blue() };
  } catch {
    return { r: 0, g: 0, b: 0 };
  }
}

export function regionKey(pos: Data.PositionData, size: Data.SizeData) {
  return `${pos.x}:${pos.y}:${size.width}:${size.height}`;
}

export function getUniqueLayerRegions(
  spriteData: Data.SpriteData,
  layerNames: string[],
) {
  const regions: [Data.PositionData, Data.SizeData][] = [];
  const regionSetAdded = new Set<string>();
  const layerNameSet = new Set(layerNames);
  for (const frame of spriteData.frames) {
    for (const layerFrame of frame.layers) {
      const layer = spriteData.layers.at(layerFrame.layerIndex);
      if (layer === undefined || !layerNameSet.has(layer.name)) continue;
      const key = regionKey(layerFrame.sheetPosition, layerFrame.size);
      if (regionSetAdded.has(key)) continue;
      regionSetAdded.add(key);
      regions.push([layerFrame.sheetPosition, layerFrame.size]);
    }
  }
  return regions;
}

// Distinct opaque colours across `layerNames` in the current sheet, as
// "#rrggbb". Returns { tooMany: true } as soon as more than `max` distinct
// colours are found (so the caller can show "no palette detected"), or null
// when there is no pixel data.
export async function extractLayerPalette(
  sheetData: Data.SpriteSheetData,
  spriteData: Data.SpriteData,
  layerNames: string[],
  max = 1024,
): Promise<{ tooMany: boolean; colors: string[] } | null> {
  if (layerNames.length === 0) return { tooMany: false, colors: [] };
  const jimpData = await getJimpData(sheetData, spriteData);
  if (!jimpData) return null;
  const data = jimpData.bitmap.data;
  const width = jimpData.bitmap.width;
  const height = jimpData.bitmap.height;
  const regions = getUniqueLayerRegions(spriteData, layerNames);
  const seen = new Set<number>();
  for (const [pos, size] of regions) {
    for (let dy = 0; dy < size.height; dy++) {
      const sy = pos.y + dy;
      if (sy < 0 || sy >= height) continue;
      for (let dx = 0; dx < size.width; dx++) {
        const sx = pos.x + dx;
        if (sx < 0 || sx >= width) continue;
        const idx = (sy * width + sx) * 4;
        if (data[idx + 3] === 0) continue;
        const packed =
          (data[idx] << 16) | (data[idx + 1] << 8) | data[idx + 2];
        if (seen.has(packed)) continue;
        seen.add(packed);
        if (seen.size > max) return { tooMany: true, colors: [] };
      }
    }
  }
  const colors = [...seen]
    .sort((a, b) => a - b)
    .map((p) => "#" + p.toString(16).padStart(6, "0"));
  return { tooMany: false, colors };
}

export async function adjustLayerColorInImage(
  spriteData: Data.SpriteData,
  jimpData: JimpData,
  layerNames: string[],
  adjustPixel: (c: ColorInstance) => ColorInstance,
) {
  const regions = getUniqueLayerRegions(spriteData, layerNames);
  for (const region of regions) {
    const [pos, size] = region;
    jimpData.scan(pos.x, pos.y, size.width, size.height, (_x, _y, idx) => {
      const r = jimpData.bitmap.data[idx + 0];
      const g = jimpData.bitmap.data[idx + 1];
      const b = jimpData.bitmap.data[idx + 2];
      const a = jimpData.bitmap.data[idx + 3];
      let c = new Color({ r, g, b, alpha: a / 255 });
      c = adjustPixel(c);
      jimpData.bitmap.data.set(
        [c.red(), c.green(), c.blue(), c.alpha() * 255],
        idx,
      );
    });
  }
}