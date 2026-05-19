import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import React, { useCallback, useMemo, useState } from "react";
import { faEye, faEyeSlash } from "@fortawesome/free-regular-svg-icons";
import Checkbox from "@mui/material/Checkbox";
import { Data } from "protosprite-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSpriteStore } from "../state";

export function Layers(): React.ReactNode {
  const sprite = useSpriteStore((state) => state.currentSprite?.sprite);
  const sheetThree = useSpriteStore(
    (state) => state.currentSprite?.spriteThree,
  );
  const spriteSelectedLayers = useSpriteStore(
    (state) => state.selectedLayerNames,
  );
  const spriteVisibleLayers = useSpriteStore(
    (state) => state.visibleLayerNames,
  );
  const currentFrame = useSpriteStore((state) => state.currentFrame);
  const toggleLayerVisible = useSpriteStore(
    (state) => state.toggleLayerVisible,
  );
  const toggleLayerSelected = useSpriteStore(
    (state) => state.toggleLayerSelected,
  );
  const toggleAllLayersSelected = useSpriteStore(
    (state) => state.toggleAllLayersSelected,
  );
  const modifiers = useSpriteStore((state) => state.modifiers);
  const renameLayer = useSpriteStore((state) => state.renameLayer);
  const moveLayer = useSpriteStore((state) => state.moveLayer);
  const mergeLayerDown = useSpriteStore((state) => state.mergeLayerDown);
  const deleteLayer = useSpriteStore((state) => state.deleteLayer);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const layers = useMemo(() => sprite?.data.layers, [sprite]);
  // Hide palette preview layers from the selector until they are Applied
  // (which bakes them into the base sprite and removes the modifier).
  const displayLayers = useMemo(() => {
    if (!layers) return layers;
    const hidden = new Set<string>();
    for (const m of modifiers) {
      if (m.type === "palette") hidden.add(m.newLayerName);
    }
    return layers.filter((l) => !hidden.has(l.name));
  }, [layers, modifiers]);

  const commitRename = useCallback(
    (oldName: string) => {
      renameLayer(oldName, draft);
      setEditing(null);
    },
    [renameLayer, draft],
  );
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

  const checkVisible = useCallback(
    (layer: Data.LayerData) => {
      if (spriteVisibleLayers === undefined) return true;
      return spriteVisibleLayers.has(layer.name);
    },
    [spriteVisibleLayers],
  );

  if (!layers || !displayLayers || !sheetThree) return null;

  return (
    <Box sx={{ width: "calc(50% - 0.5em)", height: "100%", overflow: "auto" }}>
      <Paper>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={
                    (spriteSelectedLayers &&
                      !!spriteSelectedLayers.size &&
                      spriteSelectedLayers.size !== displayLayers.length) ||
                    false
                  }
                  checked={
                    (spriteSelectedLayers &&
                      spriteSelectedLayers.size === displayLayers.length) ||
                    false
                  }
                  onChange={() =>
                    toggleAllLayersSelected(displayLayers.map((l) => l.name))
                  }
                />
              </TableCell>
              <TableCell
                padding="checkbox"
                sx={{ justifyContent: "center", alignItems: "center" }}
              >
                <FontAwesomeIcon icon={faEye} />
              </TableCell>
              <TableCell>Layer Name</TableCell>
              <TableCell>Index</TableCell>
              <TableCell>Z-Index</TableCell>
              <TableCell>Order</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayLayers.map((layer, rowIdx) => (
              <TableRow key={layer.index}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={spriteSelectedLayers?.has(layer.name) ?? false}
                    onChange={() => toggleLayerSelected(layer.name)}
                  />
                </TableCell>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={checkVisible(layer) ?? false}
                    onChange={() => toggleLayerVisible(layer.name)}
                    checkedIcon={<FontAwesomeIcon icon={faEye} />}
                    icon={<FontAwesomeIcon icon={faEyeSlash} />}
                  />
                </TableCell>
                <TableCell
                  title="Double-click to rename"
                  sx={{ cursor: "text" }}
                  onDoubleClick={() => {
                    setEditing(layer.name);
                    setDraft(layer.name);
                  }}
                >
                  {editing === layer.name ? (
                    <TextField
                      size="small"
                      variant="standard"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commitRename(layer.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          commitRename(layer.name);
                        } else if (e.key === "Escape") {
                          setEditing(null);
                        }
                      }}
                    />
                  ) : (
                    layer.name
                  )}
                </TableCell>
                <TableCell>{layer.index}</TableCell>
                <TableCell>
                  {layerFrames.get(layer.index)?.zIndex ?? 0}
                </TableCell>
                <TableCell padding="none" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditing(layer.name);
                      setDraft(layer.name);
                    }}
                    aria-label="Rename layer"
                    title="Rename layer"
                  >
                    ✎
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={rowIdx === 0}
                    onClick={() => moveLayer(layer.name, -1)}
                    aria-label="Move layer up"
                  >
                    ▲
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={rowIdx === displayLayers.length - 1}
                    onClick={() => moveLayer(layer.name, 1)}
                    aria-label="Move layer down"
                  >
                    ▼
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={rowIdx === displayLayers.length - 1}
                    onClick={() => mergeLayerDown(layer.name)}
                    aria-label="Merge layer down"
                    title="Merge into the layer below"
                  >
                    ⤓
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={displayLayers.length <= 1}
                    onClick={() => deleteLayer(layer.name)}
                    aria-label="Delete layer"
                    title="Delete layer"
                  >
                    ✕
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
