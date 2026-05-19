import { JimpData, getJimpData, setJimpData } from "./adjustColor";
import { Data } from "protosprite-core";
import { Jimp } from "jimp";
import { reindexFrameLayers } from "./reindexFrameLayers";

type Rect = { minX: number; minY: number; w: number; h: number };

// Straight-alpha source-over of one pixel onto the destination buffer.
function srcOver(
  dst: Uint8Array | Buffer,
  di: number,
  sr: number,
  sg: number,
  sb: number,
  sa: number,
) {
  if (sa === 0) return;
  const a = sa / 255;
  const da = dst[di + 3] / 255;
  const outA = a + da * (1 - a);
  if (outA <= 0) {
    dst[di] = dst[di + 1] = dst[di + 2] = dst[di + 3] = 0;
    return;
  }
  dst[di] = Math.round((sr * a + dst[di] * da * (1 - a)) / outA);
  dst[di + 1] = Math.round((sg * a + dst[di + 1] * da * (1 - a)) / outA);
  dst[di + 2] = Math.round((sb * a + dst[di + 2] * da * (1 - a)) / outA);
  dst[di + 3] = Math.round(outA * 255);
}

// Flattens the layer `upperName` into the layer directly below it (next in
// array order). For every frame containing the upper layer the upper + lower
// frame-layers are composited (lower, then upper on top) into one fresh atlas
// region assigned to the lower layer; the upper layer is then removed and all
// indices reindexed. Returns the new sheet/sprite data, or null if it cannot
// merge (no pixel data, upper missing, or nothing below it).
export async function mergeLayerDownData(
  sheetData: Data.SpriteSheetData,
  spriteData: Data.SpriteData,
  upperName: string,
): Promise<{
  sheet: Data.SpriteSheetData;
  sprite: Data.SpriteData;
} | null> {
  const sprite = spriteData.clone();
  const sheet = sheetData.clone();
  sheet.sprites[0] = sprite;

  const layers = sprite.layers;
  const ui = layers.findIndex((l) => l.name === upperName);
  if (ui < 0) return null;
  const li = ui + 1;
  if (li >= layers.length) return null;

  const img = await getJimpData(sheet, sprite);
  if (!img) return null;
  const src = img.bitmap.data;
  const srcW = img.bitmap.width;
  const srcH = img.bitmap.height;

  type Job = {
    region: { x: number; y: number };
    bbox: Rect;
    sources: Data.FrameLayerData[];
    frame: Data.FrameData;
    // The composited frame-layer that replaces this frame's upper + lower
    // frame-layers; spliced back in (with z re-derived) after reindexing.
    composite: Data.FrameLayerData;
    // The lower layer's own z offset; the flattened content sits on its
    // plane, so the composite is seeded at that offset.
    lowerZ: number;
  };
  const jobs: Job[] = [];
  let appendedH = 0;
  let maxW = srcW;

  for (const frame of sprite.frames) {
    const uppers = frame.layers.filter((fl) => fl.layerIndex === ui);
    if (uppers.length === 0) continue;
    const lowers = frame.layers.filter((fl) => fl.layerIndex === li);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    // Lower first so the upper composites on top.
    const sources = [...lowers, ...uppers];
    for (const fl of sources) {
      minX = Math.min(minX, fl.spritePosition.x);
      minY = Math.min(minY, fl.spritePosition.y);
      maxX = Math.max(maxX, fl.spritePosition.x + fl.size.width);
      maxY = Math.max(maxY, fl.spritePosition.y + fl.size.height);
    }
    const bbox: Rect = { minX, minY, w: maxX - minX, h: maxY - minY };
    if (bbox.w <= 0 || bbox.h <= 0) {
      // Degenerate; the upper frame-layers are dropped during reindex
      // (newPosOf(ui) === null).
      continue;
    }

    const region = { x: 0, y: srcH + appendedH };
    appendedH += bbox.h;
    maxW = Math.max(maxW, bbox.w);

    const composite = (lowers[0] ?? uppers[0]).clone();
    composite.size.width = bbox.w;
    composite.size.height = bbox.h;
    composite.sheetPosition.x = region.x;
    composite.sheetPosition.y = region.y;
    composite.spritePosition.x = minX;
    composite.spritePosition.y = minY;

    jobs.push({
      region,
      bbox,
      sources,
      frame,
      composite,
      lowerZ: lowers[0]?.zIndex ?? 0,
    });

    // Drop this frame's upper + lower frame-layers; the composite replaces
    // them and is spliced back in (with z re-derived) below.
    frame.layers = frame.layers.filter(
      (fl) => fl.layerIndex !== ui && fl.layerIndex !== li,
    );
  }

  const newW = maxW;
  const newH = srcH + appendedH;
  // Allocate via Jimp (the Buffer global is not polyfilled for app code).
  const out = new Jimp({ width: newW, height: newH, color: 0x00000000 });
  const dst = out.bitmap.data;
  // Copy the original atlas row-by-row (the canvas may be wider). Composited
  // output only ever goes into appended rows (y >= srcH), never back over
  // the original image, so existing content is never re-blitted.
  for (let y = 0; y < srcH; y++) {
    dst.set(
      src.subarray(y * srcW * 4, (y * srcW + srcW) * 4),
      y * newW * 4,
    );
  }

  for (const job of jobs) {
    // Explicitly zero this appended region before compositing into it.
    for (let dy = 0; dy < job.bbox.h; dy++) {
      const rowStart = ((job.region.y + dy) * newW + job.region.x) * 4;
      dst.fill(0, rowStart, rowStart + job.bbox.w * 4);
    }
    for (const fl of job.sources) {
      const offX = job.region.x + (fl.spritePosition.x - job.bbox.minX);
      const offY = job.region.y + (fl.spritePosition.y - job.bbox.minY);
      for (let dy = 0; dy < fl.size.height; dy++) {
        const sy = fl.sheetPosition.y + dy;
        if (sy < 0 || sy >= srcH) continue;
        for (let dx = 0; dx < fl.size.width; dx++) {
          const sx = fl.sheetPosition.x + dx;
          if (sx < 0 || sx >= srcW) continue;
          const si = (sy * srcW + sx) * 4;
          const di = ((offY + dy) * newW + (offX + dx)) * 4;
          srcOver(dst, di, src[si], src[si + 1], src[si + 2], src[si + 3]);
        }
      }
    }
  }

  // Remove the upper layer and reindex everything that referenced layers by
  // array position. Sidecar: the only removed old position is `ui`.
  layers.splice(ui, 1);
  const newPosOf = (i: number) => (i === ui ? null : i > ui ? i - 1 : i);
  for (let p = 0; p < layers.length; p++) {
    layers[p].index = p;
    const parent = layers[p].parentIndex;
    layers[p].parentIndex =
      parent === undefined || parent === ui
        ? undefined
        : (newPosOf(parent) ?? undefined);
  }
  const lowerNewPos = newPosOf(li) as number;
  const jobByFrame = new Map<Data.FrameData, Job>();
  for (const job of jobs) jobByFrame.set(job.frame, job);
  for (const frame of sprite.frames) {
    const job = jobByFrame.get(frame);
    frame.layers = reindexFrameLayers(
      frame.layers,
      newPosOf,
      job
        ? [
            {
              frameLayer: job.composite,
              newOwnerPos: lowerNewPos,
              seedOffset: job.lowerZ,
            },
          ]
        : [],
    );
  }

  return (await setJimpData(sheet, sprite, out as unknown as JimpData))
    ? { sheet, sprite }
    : null;
}
