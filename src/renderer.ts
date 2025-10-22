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
document.addEventListener("dragenter", (_event) => {
  console.log("File is in the Drop Space");
});
document.addEventListener("dragleave", (_event) => {
  console.log("File has left the Drop Space");
});

// Handle state updates coming over the event bridge.
window.electron.on("fileLoaded", async ({ nativePath, mimeType, data }) => {
  switch (mimeType) {
    case "image/protosprite": {
      const state = useSpriteStore.getState();
      state.updateSourceFile({
        type: "protosprite",
        nativePath,
        rawData: data,
      });
      const sheet = ProtoSpriteSheet.fromArray(data);
      state.updateCurrentSheet(sheet);
      const sprite = sheet.sprites.at(0);
      if (sprite) {
        state.updateCurrentSprite(sprite);
      } else {
        return;
      }
      const sheetThree = await new ProtoSpriteSheetThreeLoader().loadAsync(
        sheet
      );
      state.updateCurrentSheetThree(sheetThree);
      state.updateCurrentSpriteThree(sheetThree.getSprite());
      break;
    }
  }
});
