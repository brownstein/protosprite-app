import {
  adjustLayerColorInImage,
  getJimpData,
  setJimpData,
} from "./adjustColor";
import { HSVProcessingStep, StepData, StepProcessor } from "./system";

export const HSVStepProcessor: StepProcessor<HSVProcessingStep> = {
  type: "hsv",
  applyStep: async (data: StepData, step: HSVProcessingStep) => {
    const jimpData = await getJimpData(data.sheet, data.sprite);
    if (!jimpData) return null;
    adjustLayerColorInImage(data.sprite, jimpData, step.layerNames, (color) => {
      let adjustedColor = color;
      if (step.hue) adjustedColor = adjustedColor.rotate(step.hue);
      if (step.saturation) {
        if (step.saturation > 0) {
          adjustedColor = adjustedColor.saturate(step.saturation);
        } else {
          adjustedColor = adjustedColor.desaturate(-step.saturation);
        }
      }
      if (step.value) {
        if (step.value > 0) {
          adjustedColor = adjustedColor.lighten(step.value);
        } else {
          adjustedColor = adjustedColor.darken(-step.value);
        }
      }
      return adjustedColor;
    });
    const sheetClone = data.sheet.clone();
    const spriteClone = data.sprite.clone();
    return (await setJimpData(sheetClone, spriteClone, jimpData))
      ? {
          sheet: sheetClone,
          sprite: spriteClone,
        }
      : null;
  },
};
