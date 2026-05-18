import { Box, Button } from "@mui/material";
import { useCallback, useMemo } from "react";
import path from "path-browserify";
import { useSpriteStore } from "../state";

export function TopBar() {
  const sourceFile = useSpriteStore((state) => state.sourceFile);
  const currentSprite = useSpriteStore((state) => state.currentSprite);

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
    </Box>
  );
}
