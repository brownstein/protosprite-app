import { ProcessingStep, StepData } from "./systemTypes";
import { HSVStepProcessor } from "./hsvStepProcessor";
import { CompressStepProcessor } from "./compressPngProcessor";

export async function processDataSteps(data: StepData, steps: ProcessingStep[]) {
  let result: StepData | null = data;
  for (const step of steps) {
    if (result === null) return null;
    switch (step.type) {
      case "hsv":
        result = await HSVStepProcessor.applyStep(result, step);
        break;
      case "compress":
        result = await CompressStepProcessor.applyStep(result, step);
    }
  }
  return result;
}
