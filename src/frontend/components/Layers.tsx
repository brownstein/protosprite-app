import React, { useMemo } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import { useSpriteStore } from "../state";

import { adjustHsv } from "../processing/adjustColor";

export function Layers(): React.ReactNode {
  const sprite = useSpriteStore((state) => state.currentSprite);
  const sheetThree = useSpriteStore((state) => state.currentSheetThree);
  const spriteVisibleLayers = useSpriteStore((state) => state.visibleLayerNames);
  const toggleLayer = useSpriteStore((state) => state.toggleLayer);

  const layers = useMemo(() => sprite?.data.layers, [sprite]);

  if (!layers || !sheetThree) return null;

  return (
    <List
      sx={{
        width: "100%",
        maxHeight: "100%",
        bgColor: "background.paper",
        overflowY: "scroll",
      }}
    >
      {layers.map((layer, i) => (
        <ListItem key={layer.index} disablePadding>
          <ListItemButton onClick={() => toggleLayer(layer.name)} sx={{ width: "40%" }}>
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={!spriteVisibleLayers || spriteVisibleLayers.has(layer.name)}
                tabIndex={-1}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText id={layer.name} primary={layer.name} />
          </ListItemButton>
          <ListItemButton onClick={() => adjustHsv(sheetThree, [layer.name], [0, -100, 0])}>
            <ListItemText id={`${layer.name} greyscale`} primary="Greyscale"/>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
