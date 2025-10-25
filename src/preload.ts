// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, webUtils, ipcRenderer } from "electron";
import {
  createRendererEventBridge,
  RendererBridgeEvents,
} from "./rendererGlobalEvents";
import { ElectronAPI } from "./rendererGlobals";

const eventBridge = createRendererEventBridge();

ipcRenderer.on(
  "file-loaded",
  (
    _event,
    msg: {
      nativePath: string;
      mimeType: string;
      data: Uint8Array;
    }
  ) => {
    const { nativePath, mimeType, data } = msg;
    eventBridge.emit("fileLoaded", {
      nativePath,
      mimeType,
      data,
    });
  }
);

contextBridge.exposeInMainWorld("electron", {
  on: <Key extends Parameters<(typeof eventBridge)["on"]>[0]>(
    key: Key,
    callback: (data: RendererBridgeEvents[Key]) => void
  ) => {
    eventBridge.on(key, callback);
  },
  handleInitialLoad: () => {
    ipcRenderer.send("reload");
  },
  handleDroppedFiles: (files: Iterable<File>) => {
    ipcRenderer.send("files-dropped", {
      fileNames: [...files].map((file) => webUtils.getPathForFile(file)),
    });
  },
  handleLoadFileRequest: () => ipcRenderer.send("load-file"),
  handleSaveFileRequest: (fileName: string, fileContents: Uint8Array) => {
    ipcRenderer.send("save-file", {
      fileName,
      fileContents
    });
  }
} satisfies ElectronAPI);
