import Color, { ColorInstance } from "color";
import { Jimp } from "jimp";
import { Data } from "protosprite-core";

export type JimpData = Awaited<ReturnType<typeof Jimp.read>>;

export function getPngData(sheetData: Data.SpriteSheetData, spriteData: Data.SpriteData) {
  let pixelSourceBuffer: Uint8Array | undefined;
  if (Data.isEmbeddedSpriteSheetData(spriteData.pixelSource)) {
    pixelSourceBuffer = spriteData.pixelSource.pngData;
  }
  // TODO(rbrownstein): update protosprite-core to explicitly surface presence of parent sheet data.
  if (Data.isEmbeddedSpriteSheetData(sheetData.pixelSource)) {
    pixelSourceBuffer = sheetData.pixelSource.pngData;
  }
  return pixelSourceBuffer ?? null;
}

export async function getJimpData(sheetData: Data.SpriteSheetData, spriteData: Data.SpriteData) {
  const pixelSourceBuffer = getPngData(sheetData, spriteData);
  if (!pixelSourceBuffer) return null;
  const stringifiedBuffer = `data:image/png;base64,${Buffer.from(pixelSourceBuffer).toString("base64")}`;
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