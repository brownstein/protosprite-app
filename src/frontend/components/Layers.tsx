import React, { useMemo } from "react";
import { useSpriteStore } from "../state";

import "./Layers.css";

export function Layers(): React.ReactNode {
  const sprite = useSpriteStore((state) => state.currentSprite);
  const layers = useMemo(() => sprite?.data.layers, [sprite]);

  if (!layers) return null;

  return (
    <ul className="layers">
      {layers?.map((layer) => (
        <li className="layer" key={layer.index}>
          <div className="layer-index">{layer.index}</div>
          <div className="layer-name">{layer.name}</div>
        </li>
      ))}
    </ul>
  );
}