import { HSVProcessingStep, ProcessingStep } from "../processing/systemTypes";
import {
  IconButton,
  Paper,
  Slider,
  Typography,
} from "@mui/material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Box from "@mui/material/Box";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import debounce from "debounce";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { useSpriteStore } from "../state";

type HsvField = "hue" | "saturation" | "value";
type HsvValues = { hue: number; saturation: number; value: number };

// Debounce delay (ms) for committing slider drags to the store. Drags update
// local UI state immediately; the store recompute is coalesced until the user
// pauses, then flushed on release via onChangeCommitted.
const COMMIT_DEBOUNCE_MS = 200;

function HsvModifierItem(props: {
  modifier: HSVProcessingStep;
  index: number;
  onUpdate: (index: number, modifier: ProcessingStep) => void;
  onDelete: (index: number) => void;
}): React.ReactNode {
  const { modifier, index, onUpdate, onDelete } = props;

  const [local, setLocal] = useState<HsvValues>({
    hue: modifier.hue,
    saturation: modifier.saturation,
    value: modifier.value,
  });

  // Always commit against the freshest modifier (layerNames etc. may change
  // out from under us via other actions).
  const modifierRef = useRef(modifier);
  modifierRef.current = modifier;

  const commit = useMemo(
    () =>
      debounce((next: HsvValues) => {
        onUpdate(index, { ...modifierRef.current, ...next });
      }, COMMIT_DEBOUNCE_MS),
    [index, onUpdate],
  );
  useEffect(() => () => commit.clear(), [commit]);

  const setField = useCallback(
    (field: HsvField, v: number) => {
      setLocal((prev) => {
        const next = { ...prev, [field]: v };
        commit(next);
        return next;
      });
    },
    [commit],
  );

  const flush = useCallback(() => commit.flush(), [commit]);

  return (
    <ListItem>
      <ListItemIcon>
        <IconButton onClick={() => onDelete(index)}>
          <FontAwesomeIcon icon={faTrashCan} />
        </IconButton>
      </ListItemIcon>
      <ListItemText
        sx={{ width: "40%", maxWidth: "40%" }}
        primary="Adjust Color"
        secondary={modifier.layerNames.join(", ")}
      />
      <Box style={{ width: "50%", position: "relative" }}>
        <Box style={{ width: "100%", position: "relative" }}>
          <Typography>Hue</Typography>
          <Slider
            size="small"
            min={-127}
            max={127}
            step={1}
            value={local.hue}
            onChange={(_e, v) => setField("hue", v as number)}
            onChangeCommitted={flush}
          />
        </Box>
        <Box style={{ width: "100%", position: "relative" }}>
          <Typography>Saturation</Typography>
          <Slider
            size="small"
            min={-1}
            max={1}
            step={0.1}
            value={local.saturation}
            onChange={(_e, v) => setField("saturation", v as number)}
            onChangeCommitted={flush}
          />
        </Box>
        <Box style={{ width: "100%", position: "relative" }}>
          <Typography>Value</Typography>
          <Slider
            size="small"
            min={-1}
            max={1}
            step={0.1}
            value={local.value}
            onChange={(_e, v) => setField("value", v as number)}
            onChangeCommitted={flush}
          />
        </Box>
      </Box>
    </ListItem>
  );
}

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
          {modifiers.map((modifier, i) =>
            modifier.type === "hsv" ? (
              <HsvModifierItem
                key={i}
                modifier={modifier}
                index={i}
                onUpdate={updateModifier}
                onDelete={deleteModifier}
              />
            ) : null,
          )}
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
