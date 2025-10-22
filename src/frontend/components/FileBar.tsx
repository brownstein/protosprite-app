import React, { useMemo } from "react";
import path from "path-browserify";

import { useSpriteStore } from "../state";
import "./FileBar.css";

export function FileBar() {
  const sourceFile = useSpriteStore((state) => state.sourceFile);
  const fileName = useMemo(() => {
    if (!sourceFile) return null;
    const { base } = path.parse(sourceFile.nativePath);
    return base;
  }, [sourceFile]);

  return (
    <div className="file-bar">
      {fileName}
      {!fileName && "Drag a protosprite file onto this window to open it."}
    </div>
  );
}
