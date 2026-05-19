import "./SpritePreview.css";
import { Color, Scene } from "three";
import { useCallback, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PaletteProcessingStep } from "../processing/systemTypes";
import { ProtoSpriteThreeEventTypes } from "protosprite-three/dist";
import { Renderer } from "./Renderer";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { useSpriteStore } from "../state";

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
  const modifiers = useSpriteStore((state) => state.modifiers);
  const eyedropperModifierIndex = useSpriteStore(
    (state) => state.eyedropperModifierIndex
  );
  const applyEyedropperColor = useSpriteStore(
    (state) => state.applyEyedropperColor
  );
  const playing = useSpriteStore((state) => state.playing);
  const scene = useMemo(() => new Scene(), []);

  // A palette modifier's layer is a live preview - highlighted here and
  // kept out of the layer selector - until Apply bakes it into the base.
  const paletteTempLayers = useMemo(
    () =>
      modifiers
        .filter(
          (m): m is PaletteProcessingStep =>
            m.type === "palette" && m.outlineVisible
        )
        .map((m) => m.newLayerName),
    [modifiers]
  );

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

  // Highlight layer selection (white) and temporary palette layers (magenta).
  useEffect(() => {
    currentSpriteThree?.outlineAllLayers(0, new Color(), 0);
    currentSpriteThree?.outlineLayers(1, new Color(1, 1, 1), 1, [...selectedLayers ?? []]);
    if (paletteTempLayers.length) {
      currentSpriteThree?.outlineLayers(2, new Color(1, 0, 1), 1, paletteTempLayers);
    }
  }, [currentSpriteThree, selectedLayers, paletteTempLayers]);

  const advance = useCallback(
    (ms: number) => {
      if (playing) currentSpriteThree?.advance(ms);
    },
    [currentSpriteThree, playing]
  );

  const onPickColor = useCallback(
    (color: { r: number; g: number; b: number; a: number }) => {
      // Ignore clicks on fully transparent pixels; keep picking active.
      if (color.a === 0) return;
      const hex =
        "#" +
        [color.r, color.g, color.b]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
      applyEyedropperColor(hex);
    },
    [applyEyedropperColor]
  );

  return (
    <div className="sprite-preview">
      {currentSpriteThree && (
        <Renderer
          scene={scene}
          onBeforeRender={advance}
          pickActive={eyedropperModifierIndex != null}
          onPickColor={onPickColor}
        />
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
