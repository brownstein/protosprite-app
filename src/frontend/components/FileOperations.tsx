import { Box, Button } from "@mui/material";
import { useSpriteStore } from "../state";
import { useCallback } from "react";

export function FileOperations() {
  const sourceFile = useSpriteStore((state) => state.sourceFile);
  const currentSprite = useSpriteStore((state) => state.currentSprite);

  const handleLoad = useCallback(() => {
    window.electron.handleLoadFileRequest();
  }, []);

  const handleSave = useCallback(() => {
    if (!currentSprite || !sourceFile) return;
    const fileName = sourceFile.nativePath;
    const fileContents = currentSprite.sheet.toArray();
    window.electron.handleSaveFileRequest(fileName, fileContents);
  }, [sourceFile, currentSprite]);

  return (
    <Box
      sx={{
        flexGrow: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1em",
      }}
    >
      <Button variant="contained" onClick={handleLoad}>
        Load
      </Button>
      <Button variant="contained" disabled={!sourceFile} onClick={handleSave}>
        Save
      </Button>
    </Box>
  );
}
