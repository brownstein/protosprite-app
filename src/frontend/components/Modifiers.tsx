import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import {
  HSVProcessingStep,
  PaletteProcessingStep,
  ProcessingStep,
} from "../processing/systemTypes";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Box from "@mui/material/Box";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { HexColorPicker } from "react-colorful";
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

// Debounce delay (ms) for committing drags to the store. Drags update local
// UI state immediately; the store recompute is coalesced until the user
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

function PaletteModifierItem(props: {
  modifier: PaletteProcessingStep;
  index: number;
  onUpdate: (index: number, modifier: ProcessingStep) => void;
  onDelete: (index: number) => void;
}): React.ReactNode {
  const { modifier, index, onUpdate, onDelete } = props;

  const [targetColor, setTargetColor] = useState(modifier.targetColor);
  const [tolerance, setTolerance] = useState(modifier.tolerance);
  const [newLayerName, setNewLayerName] = useState(modifier.newLayerName);

  const modifierRef = useRef(modifier);
  modifierRef.current = modifier;

  const commit = useMemo(
    () =>
      debounce((patch: Partial<PaletteProcessingStep>) => {
        onUpdate(index, { ...modifierRef.current, ...patch });
      }, COMMIT_DEBOUNCE_MS),
    [index, onUpdate],
  );
  useEffect(() => () => commit.clear(), [commit]);

  const beginEyedropper = useSpriteStore((s) => s.beginEyedropper);
  const cancelEyedropper = useSpriteStore((s) => s.cancelEyedropper);
  const eyedropperActive = useSpriteStore(
    (s) => s.eyedropperModifierIndex === index,
  );
  const applyPaletteModifier = useSpriteStore(
    (s) => s.applyPaletteModifier,
  );

  // Reflect external targetColor changes (e.g. from the eyedropper).
  useEffect(() => {
    setTargetColor(modifier.targetColor);
  }, [modifier.targetColor]);

  const applyNow = useCallback(() => {
    commit.clear();
    applyPaletteModifier(index);
  }, [commit, index, applyPaletteModifier]);

  return (
    <ListItem alignItems="flex-start">
      <ListItemIcon>
        <IconButton onClick={() => onDelete(index)}>
          <FontAwesomeIcon icon={faTrashCan} />
        </IconButton>
      </ListItemIcon>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "0.5em",
        }}
      >
        <ListItemText
          primary="Palette Adjustment"
          secondary={`${modifier.layerNames.join(", ")} → ${
            modifier.newLayerName
          }`}
        />
        <HexColorPicker
          color={targetColor}
          onChange={(c) => {
            setTargetColor(c);
            commit({ targetColor: c });
          }}
        />
        <Button
          size="small"
          variant={eyedropperActive ? "contained" : "outlined"}
          onClick={() =>
            eyedropperActive ? cancelEyedropper() : beginEyedropper(index)
          }
        >
          {eyedropperActive ? "Click sprite to pick…" : "Pick from sprite"}
        </Button>
        <Box>
          <Typography>Tolerance</Typography>
          <Slider
            size="small"
            min={0}
            max={100}
            step={1}
            value={tolerance}
            onChange={(_e, v) => {
              setTolerance(v as number);
              commit({ tolerance: v as number });
            }}
            onChangeCommitted={() => commit.flush()}
          />
        </Box>
        <TextField
          size="small"
          label="New layer name"
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          onBlur={() => {
            if (newLayerName !== modifierRef.current.newLayerName) {
              commit.clear();
              onUpdate(index, { ...modifierRef.current, newLayerName });
            }
          }}
        />
        <Button variant="contained" size="small" onClick={applyNow}>
          Apply
        </Button>
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

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const addAdjustColor = useCallback(() => {
    addModifier({
      type: "hsv",
      layerNames: [...(selectedLayers ?? [])],
      hue: 0,
      saturation: 0,
      value: 0,
    });
  }, [selectedLayers, addModifier]);

  const addPalette = useCallback(() => {
    const used = new Set(
      currentSprite?.sprite.data.layers.map((l) => l.name) ?? [],
    );
    for (const m of modifiers) {
      if (m.type === "palette") used.add(m.newLayerName);
    }
    let n = 1;
    while (used.has(`Palette ${n}`)) n++;
    addModifier({
      type: "palette",
      layerNames: [...(selectedLayers ?? [])],
      targetColor: "#ff0000",
      tolerance: 24,
      newLayerName: `Palette ${n}`,
    });
  }, [currentSprite, modifiers, selectedLayers, addModifier]);

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
          {modifiers.map((modifier, i) => {
            if (modifier.type === "hsv") {
              return (
                <HsvModifierItem
                  key={i}
                  modifier={modifier}
                  index={i}
                  onUpdate={updateModifier}
                  onDelete={deleteModifier}
                />
              );
            }
            if (modifier.type === "palette") {
              return (
                <PaletteModifierItem
                  key={i}
                  modifier={modifier}
                  index={i}
                  onUpdate={updateModifier}
                  onDelete={deleteModifier}
                />
              );
            }
            return null;
          })}
          <ListItem>
            <ListItemButton
              disabled={!selectedLayers?.size}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <ListItemText primary="Add Modifier" />
            </ListItemButton>
            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem
                onClick={() => {
                  addAdjustColor();
                  setMenuAnchor(null);
                }}
              >
                Adjust Color
              </MenuItem>
              <MenuItem
                onClick={() => {
                  addPalette();
                  setMenuAnchor(null);
                }}
              >
                Palette Adjustment
              </MenuItem>
            </Menu>
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
}
