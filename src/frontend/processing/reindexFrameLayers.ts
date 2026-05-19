import { Data } from "protosprite-core";

// Re-deriving frame-layer z after a layer add/remove/reorder.
//
// A frame-layer's render slot in protosprite-three is `layer.index + zIndex`
// (see protosprite-three index.js). `zIndex` is NOT an absolute offset: it is
// a *relative* move. +k means "bubble forward past k layers", -k "back past
// k layers"; the layers it passes are displaced the other way. So the visible
// stack is: take the frame-layers, then apply each zIndex as a bubble.
//
// When layers are added/removed the array positions shift, so every surviving
// frame-layer's `zIndex` must be re-derived to keep the *same visible stack*
// (for add/remove/merge) or to follow the moved layer (for reorder, which the
// callers model as a remove + an add).
//
// The robust way to do this -- and the part that is easy to get wrong with a
// naive index remap, because the slot can land on a removed layer or outside
// the array -- is:
//
//  1. Read the current visible stack exactly as the renderer would order it
//     (so existing sprites do not visually change).
//  2. Drop frame-layers whose owning layer was removed; splice in the new
//     frame-layers at the position implied by their new owning layer.
//  3. Walk that stack and assign each frame-layer a final slot that is
//     strictly increasing (ties only between consecutive frame-layers of the
//     same owning layer, which is a pre-existing, acceptable case). The new
//     `zIndex` is `finalSlot - newOwningLayerPos` -- i.e. exactly the number
//     of added/subtracted layers between the layer's final sorted index and
//     its final sorted index with z applied.
//
// Step 3's strictly-increasing slots mean the renderer reproduces the stack
// deterministically without relying on its z-fight nudge kludge.

export type FrameLayerInsertion = {
  // A freshly created frame-layer (composited merge output, palette split
  // mirror, or a moved layer's re-added frame-layer). Its layerIndex/zIndex
  // are assigned by reindexFrameLayers.
  frameLayer: Data.FrameLayerData;
  // The new array position of the layer this frame-layer belongs to.
  newOwnerPos: number;
  // Offset to seed the new frame-layer at relative to its owner (default 0).
  // Used when re-adding a moved layer's frame-layer to preserve its own z.
  seedOffset?: number;
  // If set, place this frame-layer directly above `anchorAfter` in the stack
  // (used by the palette split so a split layer sits right above its source).
  // Must be one of the surviving original frame-layers.
  anchorAfter?: Data.FrameLayerData;
};

// Order frame-layers exactly as protosprite-three renders them: ascending by
// (layerIndex + zIndex); equal base slots resolved by the renderer's nudge
// (negative z first, then frame.layers iteration order, then positive z).
function rendererOrder(
  frameLayers: Data.FrameLayerData[],
): Data.FrameLayerData[] {
  return frameLayers
    .map((fl, i) => ({ fl, i, slot: fl.layerIndex + fl.zIndex }))
    .sort((a, b) => {
      if (a.slot !== b.slot) return a.slot - b.slot;
      const an = a.fl.zIndex < 0 ? -1 : a.fl.zIndex > 0 ? 1 : 0;
      const bn = b.fl.zIndex < 0 ? -1 : b.fl.zIndex > 0 ? 1 : 0;
      if (an !== bn) return an - bn;
      return a.i - b.i;
    })
    .map((e) => e.fl);
}

type StackNode = {
  fl: Data.FrameLayerData;
  L: number; // new owning-layer array position
  seedOffset: number; // desired offset from L before monotone repair
};

// Recompute `layerIndex`/`zIndex` for every frame-layer of a single frame
// after a layer-array change. Returns the new `frame.layers`, in stack order
// (so the renderer's iteration-order tiebreak for same-owner equal slots
// matches the preserved stack). Surviving frame-layers and inserted ones are
// mutated in place.
//
//   frameLayers : the frame's original frame.layers (old layerIndex/zIndex).
//   newPosOf    : old owning-layer position -> new position, or null if that
//                 layer's frame-layers should be dropped from the stack
//                 (deleted/merged-away layer, or a moved layer being re-added
//                 via `insertions`).
//   insertions  : frame-layers to splice in (see FrameLayerInsertion).
export function reindexFrameLayers(
  frameLayers: Data.FrameLayerData[],
  newPosOf: (oldOwnerPos: number) => number | null,
  insertions: FrameLayerInsertion[] = [],
): Data.FrameLayerData[] {
  // 1 + 2a: preserved stack = surviving frame-layers in the renderer's
  // current visual order, mapped to their new owning-layer position.
  const stack: StackNode[] = [];
  for (const fl of rendererOrder(frameLayers)) {
    const L = newPosOf(fl.layerIndex);
    if (L === null) continue; // owning layer removed -> dropped
    stack.push({ fl, L, seedOffset: fl.zIndex });
  }

  // 2b: splice in inserted frame-layers. An explicit anchor wins; otherwise
  // place respecting new layer order ("after the last node whose new owning
  // position is <= this one's"). Stable in input order for equal positions.
  for (const ins of insertions) {
    const node: StackNode = {
      fl: ins.frameLayer,
      L: ins.newOwnerPos,
      seedOffset: ins.seedOffset ?? 0,
    };
    let at = -1;
    if (ins.anchorAfter) {
      at = stack.findIndex((n) => n.fl === ins.anchorAfter);
    }
    if (at < 0) {
      for (let k = 0; k < stack.length; k++) {
        if (stack[k].L <= node.L) at = k;
      }
    }
    stack.splice(at + 1, 0, node);
  }

  // 3: monotone-repair walk. Slots strictly increase, except two consecutive
  // frame-layers on the same owning layer may share a slot (a pre-existing,
  // acceptable tie -- e.g. several atlas regions of one layer at one depth).
  let prevSlot = -Infinity;
  let prevL: number | null = null;
  const out: Data.FrameLayerData[] = [];
  for (const n of stack) {
    const seed = n.L + n.seedOffset;
    const slot =
      n.L === prevL && seed <= prevSlot
        ? prevSlot
        : Math.max(seed, prevSlot + 1);
    n.fl.layerIndex = n.L;
    n.fl.zIndex = slot - n.L;
    out.push(n.fl);
    prevSlot = slot;
    prevL = n.L;
  }
  return out;
}
