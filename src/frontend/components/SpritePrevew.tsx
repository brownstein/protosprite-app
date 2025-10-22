import React, { useCallback, useEffect, useMemo } from "react";
import { Scene } from "three";

import { Renderer } from "./Renderer";
import { useSpriteStore } from "../state";
import "./SpritePreview.css";

export function SpritePreview() {
  const currentSpriteThree = useSpriteStore(
    (store) => store.currentSpriteThree
  );
  const scene = useMemo(() => new Scene(), []);

  useEffect(() => {
    if (currentSpriteThree) {
      currentSpriteThree.center();
      currentSpriteThree.mesh.scale.y = -1;
      scene.add(currentSpriteThree?.mesh);
    }
    return () => {
      if (currentSpriteThree) scene.remove(currentSpriteThree?.mesh);
    };
  }, [currentSpriteThree, scene]);

  const advance = useCallback(
    (ms: number) => {
      currentSpriteThree?.advance(ms);
    },
    [currentSpriteThree]
  );

  return (
    <div className="sprite-preview">
      <Renderer scene={scene} onBeforeRender={advance} />
    </div>
  );
}
