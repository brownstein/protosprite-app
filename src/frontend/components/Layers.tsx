import React, { useMemo } from "react";
import { Data } from "protosprite-core";
import Checkbox from "@mui/material/Checkbox";
import { useSpriteStore } from "../state";

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

export function Layers(): React.ReactNode {
  const sprite = useSpriteStore((state) => state.currentSprite?.sprite);
  const sheetThree = useSpriteStore((state) => state.currentSprite?.spriteThree);
  const spriteSelectedLayers = useSpriteStore(
    (state) => state.selectedLayerNames,
  );
  const currentFrame = useSpriteStore((state) => state.currentFrame);
  const toggleLayer = useSpriteStore((state) => state.toggleLayerVisible);
  const toggleLayerSelected = useSpriteStore(
    (state) => state.toggleLayerSelected,
  );
  const toggleAllLayersSelected = useSpriteStore(
    (state) => state.toggleAllLayersSelected,
  );

  const layers = useMemo(() => sprite?.data.layers, [sprite]);
  const layerFrames = useMemo(() => {
    const layerFrameMap = new Map<number, Data.FrameLayerData>();
    if (!currentFrame) return layerFrameMap;
    const frame = sprite?.data.frames.at(currentFrame);
    if (!frame) return layerFrameMap;
    for (const layerFrame of frame.layers) {
      layerFrameMap.set(layerFrame.layerIndex, layerFrame);
    }
    return layerFrameMap;
  }, [sprite, currentFrame]);

  if (!layers || !sheetThree) return null;

  return (
    <Box sx={{ width: "50%", overflow: "scroll" }}>
      <Paper>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={
                    spriteSelectedLayers &&
                    !!spriteSelectedLayers.size &&
                    spriteSelectedLayers.size !== layers.length
                  }
                  checked={
                    spriteSelectedLayers &&
                    spriteSelectedLayers.size == layers.length
                  }
                  onChange={toggleAllLayersSelected}
                />
              </TableCell>
              <TableCell>Layer Name</TableCell>
              <TableCell>Index</TableCell>
              <TableCell>Z-Index</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {layers.map((layer) => (
              <TableRow key={layer.index}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={spriteSelectedLayers?.has(layer.name) ?? false}
                    onChange={() => toggleLayerSelected(layer.name)}
                  />
                </TableCell>
                <TableCell>{layer.name}</TableCell>
                <TableCell>{layer.index}</TableCell>
                <TableCell>
                  {layerFrames.get(layer.index)?.zIndex ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
