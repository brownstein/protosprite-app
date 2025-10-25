import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { useCallback, useEffect, useMemo } from "react";
import { Color, Scene } from "three";

import { Renderer } from "./Renderer";
import { useSpriteStore } from "../state";
import "./SpritePreview.css";
import { ProtoSpriteThreeEventTypes } from "protosprite-three/dist";

export function SpritePreview() {
  const currentSpriteThree = useSpriteStore(
    (store) => store.currentSprite?.spriteThree
  );
  const selectedLayers = useSpriteStore(
    (state) => state.selectedLayerNames
  );
  const setCurrentFrame = useSpriteStore(
    (store) => store.setCurrentFrame
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

  // Link current frame to store.
  useEffect(() => {
    const onFrameChange = (arg: ProtoSpriteThreeEventTypes["animationFrameSwapped"]) => {
      setCurrentFrame(arg.to);
    };
    currentSpriteThree?.events.on("animationFrameSwapped", onFrameChange);
    setCurrentFrame(currentSpriteThree?.data.animationState.currentFrame ?? 0);
    return () => {
      currentSpriteThree?.events.off("animationFrameSwapped", onFrameChange);
    }
  }, [currentSpriteThree, setCurrentFrame]);

  // Highlight layer selection.
  useEffect(() => {
    currentSpriteThree?.outlineAllLayers(0, new Color(), 0);
    currentSpriteThree?.outlineLayers(1, new Color(1, 1, 1), 1, [...selectedLayers ?? []]);
  }, [currentSpriteThree, selectedLayers]);

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
