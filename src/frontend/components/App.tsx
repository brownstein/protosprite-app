import React from "react";
import "./App.css";
import { Layers } from "./Layers";
import { FileBar } from "./FileBar";
import { SpritePreview } from "./SpritePrevew";

export function App(): React.ReactElement {
  return (
    <div className="app">
      <FileBar />
      <SpritePreview />
      <Layers />
    </div>
  );
}
