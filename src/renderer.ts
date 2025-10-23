import { ipcRenderer } from "electron";
import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./frontend/components/App";
import { useSpriteStore } from "./frontend/state";
import "./index.css";
import { ProtoSpriteSheet } from "protosprite-core";
import { ProtoSpriteSheetThreeLoader } from "protosprite-three/dist";

const root = createRoot(document.body);
root.render(React.createElement(App));

// Handle drag and drop for sprites.
document.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.stopPropagation();
});
document.addEventListener("drop", (event) => {
  event.preventDefault();
  event.stopPropagation();
  const files = event.dataTransfer?.files;
  if (files === undefined) return;
  const filesIterable: File[] = [];
  for (const file of files) {
    filesIterable.push(file);
  }
  window.electron.handleDroppedFiles(filesIterable);
});

// Handle state updates coming over the event bridge.
window.electron.on("fileLoaded", async ({ nativePath, mimeType, data }) => {
  switch (mimeType) {
    case "image/protosprite": {
      const state = useSpriteStore.getState();
      const sheet = ProtoSpriteSheet.fromArray(data);
      const sprite = sheet.sprites.at(0);
      if (!sprite) return;
      const sheetThree = await new ProtoSpriteSheetThreeLoader().loadAsync(
        sheet
      );
      const spriteThree = sheetThree.getSprite();
      state.onAfterLoad({
        sourceFile: {
          type: "protosprite",
          nativePath,
          rawData: data,
        },
        currentSheet: sheet,
        currentSprite: sprite,
        currentSheetThree: sheetThree,
        currentSpriteThree: spriteThree,
      });
      break;
    }
  }
});

// Tell the main process we've loaded up.
window.electron.handleInitialLoad();
