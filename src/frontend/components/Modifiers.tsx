import debounce from "debounce";
import React, { useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import { useSpriteStore } from "../state";
import {
  IconButton,
  Paper,
  Slider,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";

export function Modifiers(): React.ReactNode {
  const currentSprite = useSpriteStore((state) => state.currentSprite);
  const modifiers = useSpriteStore((state) => state.modifiers);
  const selectedLayers = useSpriteStore((state) => state.selectedLayerNames);
  const addModifier = useSpriteStore((state) => state.pushModifier);
  const updateModifier = useSpriteStore((state) => state.updateModifier);
  const deleteModifier = useSpriteStore((state) => state.removeModifier);

  const modifySelected = useCallback(() => {
    addModifier({
      type: "hsv",
      layerNames: [...(selectedLayers ?? [])],
      hue: 0,
      saturation: 0,
      value: 0,
    });
  }, [selectedLayers, addModifier]);

  if (!currentSprite) return null;

  return (
    <Box
      sx={{
        width: "calc(50% - 0.5em)",
        height: "100%",
        maxHeight: "100%",
        overflow: "auto",
      }}
    >
      <Paper>
        <List dense>
          {modifiers.map((modifier, i) => (
            <ListItem key={i}>
              <ListItemIcon>
                <IconButton onClick={() => deleteModifier(i)}>
                  <FontAwesomeIcon icon={faTrashCan} />
                </IconButton>
              </ListItemIcon>
              <ListItemText
                sx={{
                  width: "40%",
                  maxWidth: "40%",
                }}
                primary="Adjust Color"
                secondary={
                  modifier.type === "hsv"
                    ? modifier.layerNames.join(", ")
                    : undefined
                }
              />
              {modifier.type === "hsv" && (
                <Box style={{ width: "50%", position: "relative" }}>
                  <Box style={{ width: "100%", position: "relative" }}>
                    <Typography>Hue</Typography>
                    <Slider
                      size="small"
                      min={-127}
                      max={127}
                      step={1}
                      value={modifier.hue}
                      onChange={(_e, v) =>
                        updateModifier(i, { ...modifier, hue: v })
                      }
                    />
                  </Box>
                  <Box style={{ width: "100%", position: "relative" }}>
                    <Typography>Saturation</Typography>
                    <Slider
                      size="small"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={modifier.saturation}
                      onChange={(_e, v) =>
                        updateModifier(i, {
                          ...modifier,
                          saturation: v,
                        })
                      }
                    />
                  </Box>
                  <Box style={{ width: "100%", position: "relative" }}>
                    <Typography>Value</Typography>
                    <Slider
                      size="small"
                      min={-1}
                      max={1}
                      step={0.1}
                      value={modifier.value}
                      onChange={(_e, v) =>
                        updateModifier(i, { ...modifier, value: v })
                      }
                    />
                  </Box>
                </Box>
              )}
            </ListItem>
          ))}
          <ListItem>
            <ListItemButton
              disabled={!selectedLayers?.size}
              onClick={modifySelected}
            >
              <ListItemText primary="Add Modifier" />
            </ListItemButton>
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
}
