import { Data } from "protosprite-core";

export type HSVProcessingStep = {
  type: "hsv";
  layerNames: string[];
  hue: number;
  saturation: number;
  value: number;
};

export function isHSVProcessingStep(
  step: ProcessingStep,
): step is HSVProcessingStep {
  return step.type === "hsv";
}

export type ProcessingStep = HSVProcessingStep;

export type StepData = {
  sheet: Data.SpriteSheetData;
  sprite: Data.SpriteData;
};

export type StepProcessor<T extends ProcessingStep> = {
  type: T["type"];
  applyStep: (data: StepData, step: T) => Promise<StepData | null>;
};
