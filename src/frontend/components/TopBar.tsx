import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Slider,
  Typography,
} from "@mui/material";
import { useCallback, useMemo } from "react";
import path from "path-browserify";
import { useSpriteStore } from "../state";

const NONE = "__none__";

export function TopBar() {
  const sourceFile = useSpriteStore((state) => state.sourceFile);
  const currentSprite = useSpriteStore((state) => state.currentSprite);
  const currentAnimationName = useSpriteStore(
    (state) => state.currentAnimationName,
  );
  const setAnimation = useSpriteStore((state) => state.setAnimation);
  const playing = useSpriteStore((state) => state.playing);
  const setPlaying = useSpriteStore((state) => state.setPlaying);
  const gotoFrame = useSpriteStore((state) => state.gotoFrame);
  const currentFrame = useSpriteStore((state) => state.currentFrame) ?? 0;

  const sprite = currentSprite?.sprite;
  const animations = useMemo(
    () => sprite?.data.animations ?? [],
    [sprite],
  );
  const frameCount = sprite?.data.frames.length ?? 0;
  // Scale the transport to the selected animation's frame range; fall back
  // to the whole sprite when no animation is selected.
  const activeAnim = currentAnimationName
    ? animations.find((a) => a.name === currentAnimationName)
    : undefined;
  const rangeStart = activeAnim ? activeAnim.indexStart : 0;
  const rangeEnd = activeAnim
    ? activeAnim.indexEnd
    : Math.max(0, frameCount - 1);
  const rangeLen = rangeEnd - rangeStart + 1;
  const frame = Math.min(Math.max(currentFrame, rangeStart), rangeEnd);
  // Arrow buttons wrap around within the range.
  const prevFrame = frame <= rangeStart ? rangeEnd : frame - 1;
  const nextFrame = frame >= rangeEnd ? rangeStart : frame + 1;

  const fileName = useMemo(() => {
    if (!sourceFile) return null;
    return path.parse(sourceFile.nativePath).base;
  }, [sourceFile]);

  const handleLoad = useCallback(() => {
    window.electron.handleLoadFileRequest();
  }, []);

  const handleSave = useCallback(() => {
    if (!currentSprite || !sourceFile) return;
    window.electron.handleSaveFileRequest(
      sourceFile.nativePath,
      currentSprite.sheet.toArray(),
    );
  }, [sourceFile, currentSprite]);

  return (
    <Box
      className="top-bar"
      sx={{ display: "flex", alignItems: "center", gap: "0.5em", px: "0.5em" }}
    >
      <Button variant="contained" size="small" onClick={handleLoad}>
        Load
      </Button>
      <Button
        variant="contained"
        size="small"
        disabled={!sourceFile}
        onClick={handleSave}
      >
        Save
      </Button>
      <Box sx={{ opacity: 0.7, ml: "0.5em", flexGrow: 1 }}>
        {fileName ?? "Drag a protosprite file onto this window to open it."}
      </Box>

      <Select
        size="small"
        disabled={!sprite}
        value={currentAnimationName ?? NONE}
        onChange={(e) =>
          setAnimation(e.target.value === NONE ? null : e.target.value)
        }
        sx={{ minWidth: "10em" }}
      >
        <MenuItem value={NONE}>(no animation)</MenuItem>
        {animations.map((a) => (
          <MenuItem key={a.name} value={a.name}>
            {a.name}
          </MenuItem>
        ))}
      </Select>

      <IconButton
        size="small"
        disabled={!sprite}
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? "⏸" : "▶"}
      </IconButton>
      <IconButton
        size="small"
        disabled={!sprite || rangeLen <= 1}
        onClick={() => gotoFrame(prevFrame)}
        aria-label="Previous frame"
      >
        ◀
      </IconButton>
      <Slider
        size="small"
        min={rangeStart}
        max={rangeEnd}
        step={1}
        value={frame}
        disabled={!sprite || rangeLen <= 1}
        onChange={(_e, v) => gotoFrame(v as number)}
        sx={{ width: "10em" }}
      />
      <IconButton
        size="small"
        disabled={!sprite || rangeLen <= 1}
        onClick={() => gotoFrame(nextFrame)}
        aria-label="Next frame"
      >
        ▶
      </IconButton>
      <Typography variant="body2" sx={{ minWidth: "4em", textAlign: "right" }}>
        {sprite ? `${frame - rangeStart + 1}/${rangeLen}` : "-/-"}
      </Typography>
    </Box>
  );
}
