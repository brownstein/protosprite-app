import { Data } from "protosprite-core";

export type HSVProcessingStep = {
  type: "hsv";
  layerNames: string[];
  hue: number;
  saturation: number;
  value: number;
};

export type CompressProcessingStep = {
  type: "compress";
};

export type PaletteProcessingStep = {
  type: "palette";
  // Source layers whose pixels are scanned for matches.
  layerNames: string[];
  // Target colour as "#rrggbb".
  targetColor: string;
  // 0..100; mapped to an RGB euclidean-distance threshold.
  tolerance: number;
  // Destination layer the matched pixels are moved into.
  newLayerName: string;
  // false = temporary (preview-only highlight); true = materialized so the
  // new layer surfaces in the layer selector.
  applied: boolean;
};

export function isHSVProcessingStep(
  step: ProcessingStep,
): step is HSVProcessingStep {
  return step.type === "hsv";
}

export function isPaletteProcessingStep(
  step: ProcessingStep,
): step is PaletteProcessingStep {
  return step.type === "palette";
}

export type ProcessingStep =
  | HSVProcessingStep
  | CompressProcessingStep
  | PaletteProcessingStep;

export type StepData = {
  sheet: Data.SpriteSheetData;
  sprite: Data.SpriteData;
};

export type StepProcessor<T extends ProcessingStep> = {
  type: T["type"];
  applyStep: (data: StepData, step: T) => Promise<StepData | null>;
};
