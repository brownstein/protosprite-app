import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { useCallback, useEffect, useMemo } from "react";
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
      {currentSpriteThree && (
        <Renderer scene={scene} onBeforeRender={advance} />
      )}
      {!currentSpriteThree && (
        <div className="missing">
          <FontAwesomeIcon icon={faFile} className="icon" />
          <div>Please open a file for preview.</div>
        </div>
      )}
    </div>
  );
}
