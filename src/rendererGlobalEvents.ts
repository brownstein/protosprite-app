import { createTypedEventEmitter } from "./util/TypedEventEmitter";

export type RendererBridgeEvents = {
  fileLoaded: {
    nativePath: string;
    mimeType: string;
    data: Uint8Array;
  },
  fileLoadProgress: {
    progress: number;
  },
  fileLoadError: {
    error: string;
  }
}

export function createRendererEventBridge() {
  return createTypedEventEmitter<RendererBridgeEvents>();
};
