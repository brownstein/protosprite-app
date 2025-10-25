import { CompressProcessingStep, StepData, StepProcessor } from "./systemTypes";

export const CompressStepProcessor: StepProcessor<CompressProcessingStep> = {
  type: "compress",
  applyStep: async (data: StepData, _step: CompressProcessingStep) => {
    return data;
    // const pngData = await getPngData(data.sheet, data.sprite);
    // if (!pngData) return null;
    // const png = new PNG().parse(Buffer.from(pngData));
    // const compressedPngData = new Uint8Array(PNG.sync.write(png, {}));
    // const sheetClone = data.sheet.clone();
    // const spriteClone = data.sprite.clone();
    // sheetClone.sprites[0] = spriteClone;
    // return setPngData(sheetClone, spriteClone, compressedPngData)
    //   ? {
    //       sheet: sheetClone,
    //       sprite: spriteClone,
    //     }
    //   : null;
  },
};
