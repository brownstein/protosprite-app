import { TypedEventEmitter } from "./util/TypedEventEmitter";
import { RendererBridgeEvents } from "./rendererGlobalEvents";

export type ElectronAPI = {
  on<Key extends keyof RendererBridgeEvents>(
    key: Key,
    callback: (arg: Parameters<RendererBridgeEvents[Key]>[0]) => void
  ): void;
  handleInitialLoad: () => void;
  handleDroppedFiles: (files: Iterable<File>) => void;
  handleLoadFileRequest: () => void;
  handleSaveFileRequest: (fileName: string, fileContents: Uint8Array) => void;
};

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
