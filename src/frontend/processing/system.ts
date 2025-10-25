import { ProcessingStep, StepData } from "./systemTypes";
import { HSVStepProcessor } from "./hsvStepProcessor";
import { CompressStepProcessor } from "./compressPngProcessor";
import { ProtoSpriteSheetThreeLoader } from "protosprite-three";
import { ProtoSpriteSheet } from "protosprite-core";

export async function processDataSteps(
  data: StepData,
  steps: ProcessingStep[],
) {
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

export async function produceProtoSpriteThree(data: StepData) {
  const loader = new ProtoSpriteSheetThreeLoader();
  const sheetThree = await loader.loadAsync(new ProtoSpriteSheet(data.sheet));
  const spriteThree = sheetThree.getSprite();
  return {
    sheetThree,
    spriteThree,
  };
}
