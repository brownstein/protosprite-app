import Color, { ColorInstance } from "color";
import { NearestFilter, TextureLoader } from "three";
import { Jimp } from "jimp";
import { Data } from "protosprite-core";
import { ProtoSpriteSheetThree } from "protosprite-three";

export type JimpData = Awaited<ReturnType<typeof Jimp.read>>;

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

export async function adjustHsv(
  prs: ProtoSpriteSheetThree,
  layerNames: string[],
  hsvAdjustment: [number, number, number],
) {
  const sprite = prs.getSprite();
  if (!sprite) return false;
  const sheetMaterial = prs.sheetMaterial;
  const texture = prs.sheetTexture;
  if (!texture || !sheetMaterial) return false;
  const img = texture.image as HTMLImageElement;
  const imgUrl = img.src;
  const j = await Jimp.read(imgUrl);

  adjustLayerColorInImage(sprite.data.sprite.data, j, layerNames, (c) => {
    return c.desaturate(1);
  });

  const buff = await j.getBuffer("image/png");
  const blob = new Blob([new Uint8Array(buff)], { type: "image/png " });
  const dataUrl = URL.createObjectURL(blob);
  const newTexture = await new TextureLoader().loadAsync(dataUrl);
  newTexture.minFilter = NearestFilter;
  newTexture.magFilter = NearestFilter;
  prs.sheetTexture = newTexture;
  sheetMaterial.uniforms.map.value = newTexture;
  sheetMaterial.uniformsNeedUpdate = true;
  texture.dispose();
}
