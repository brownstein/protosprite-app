export type HSVProcessingStep = {
  type: "hsv";
  layerNames: string[];
  hue: number;
  saturation: number;
  value: number;
};

export function isHSVProcessingStep(step: ProcessingStep): step is HSVProcessingStep {
  return step.type === "hsv";
}

export type ProcessingStep = HSVProcessingStep;

export type StepProcessor = {
  type: ProcessingStep["type"];
};
