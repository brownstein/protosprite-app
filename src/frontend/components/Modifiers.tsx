import {
  Button,
  Collapse,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Slider,
  Switch,
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
import { extractLayerPalette } from "../processing/adjustColor";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { useSpriteStore } from "../state";

type HsvField = "hue" | "saturation" | "value";
type HsvValues = { hue: number; saturation: number; value: number };

// Debounce delay (ms) for committing drags to the store. Drags update local
// UI state immediately; the store recompute is coalesced until the user
// pauses, then flushed on release via onChangeCommitted.
const COMMIT_DEBOUNCE_MS = 200;

// Collapsible shell shared by every modifier list item: a header (delete +
// expand toggle + title) over a Collapse-wrapped body of controls.
function ModifierFrame(props: {
  index: number;
  title: string;
  subtitle?: string;
  onDelete: (index: number) => void;
  children: React.ReactNode;
}): React.ReactNode {
  const { index, title, subtitle, onDelete, children } = props;
  const [open, setOpen] = useState(true);
  return (
    <ListItem
      disableGutters
      sx={{ flexDirection: "column", alignItems: "stretch" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
        <ListItemIcon sx={{ minWidth: "auto" }}>
          <IconButton onClick={() => onDelete(index)}>
            <FontAwesomeIcon icon={faTrashCan} />
          </IconButton>
        </ListItemIcon>
        <ListItemButton onClick={() => setOpen((o) => !o)}>
          <Box sx={{ width: "1.5em", userSelect: "none" }}>
            {open ? "▾" : "▸"}
          </Box>
          <ListItemText primary={title} secondary={subtitle} />
        </ListItemButton>
      </Box>
      <Collapse in={open} sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5em",
            px: "1em",
            pb: "0.5em",
          }}
        >
          {children}
        </Box>
      </Collapse>
    </ListItem>
  );
}

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

  const applyModifier = useSpriteStore((s) => s.applyModifier);
  const applyNow = useCallback(() => {
    commit.clear();
    applyModifier(index);
  }, [commit, index, applyModifier]);

  return (
    <ModifierFrame
      index={index}
      title="Adjust Color"
      subtitle={modifier.layerNames.join(", ")}
      onDelete={onDelete}
    >
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
      <Button variant="contained" size="small" onClick={applyNow}>
        Apply
      </Button>
    </ModifierFrame>
  );
}

function PaletteModifierItem(props: {
  modifier: PaletteProcessingStep;
  index: number;
  onUpdate: (index: number, modifier: ProcessingStep) => void;
  onDelete: (index: number) => void;
}): React.ReactNode {
  const { modifier, index, onUpdate, onDelete } = props;

  const [colors, setColors] = useState<string[]>(modifier.targetColors);
  const [activeIndex, setActiveIndex] = useState(0);
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
  const applyModifier = useSpriteStore((s) => s.applyModifier);

  // Reflect external targetColors changes (e.g. the eyedropper appends one).
  useEffect(() => {
    setColors(modifier.targetColors);
    setActiveIndex((i) =>
      Math.min(i, Math.max(0, modifier.targetColors.length - 1)),
    );
  }, [modifier.targetColors]);

  const activeColor = colors[activeIndex] ?? colors[0] ?? "#000000";

  // Structural color changes (add/remove) commit immediately; picker drags
  // are debounced via `commit`.
  const pushColors = useCallback(
    (next: string[]) => {
      commit.clear();
      setColors(next);
      onUpdate(index, { ...modifierRef.current, targetColors: next });
    },
    [commit, index, onUpdate],
  );

  const applyNow = useCallback(() => {
    commit.clear();
    applyModifier(index);
  }, [commit, index, applyModifier]);

  // Palette of the source layers (from the base sprite, so it stays stable
  // regardless of what this modifier has already split out).
  const baseSprite = useSpriteStore((s) => s.baseSprite);
  const [palette, setPalette] = useState<{
    state: "none" | "tooMany" | "ok";
    colors: string[];
  }>({ state: "none", colors: [] });
  const sourceLayerKey = modifier.layerNames.join(" ");

  useEffect(() => {
    if (!baseSprite || modifier.layerNames.length === 0) {
      setPalette({ state: "none", colors: [] });
      return;
    }
    let cancelled = false;
    const sheet = baseSprite.sheet.data;
    const sprite = baseSprite.sprite.data;
    const names = sourceLayerKey ? sourceLayerKey.split(" ") : [];
    const timer = setTimeout(() => {
      extractLayerPalette(sheet, sprite, names).then((r) => {
        if (cancelled) return;
        if (!r || (!r.tooMany && r.colors.length === 0)) {
          setPalette({ state: "none", colors: [] });
        } else if (r.tooMany) {
          setPalette({ state: "tooMany", colors: [] });
        } else {
          setPalette({ state: "ok", colors: r.colors });
        }
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [baseSprite, sourceLayerKey, modifier.layerNames.length]);

  const paletteMode = palette.state === "ok";
  const selectedSet = useMemo(() => new Set(colors), [colors]);
  const togglePaletteColor = useCallback(
    (c: string) => {
      pushColors(
        colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c],
      );
    },
    [colors, pushColors],
  );

  return (
    <ModifierFrame
      index={index}
      title="Palette Adjustment"
      subtitle={`${modifier.layerNames.join(", ")} → ${modifier.newLayerName}`}
      onDelete={onDelete}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "0.5em" }}>
        {paletteMode ? (
          <>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Click palette colors to toggle selection
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.25em",
                maxHeight: "8em",
                overflowY: "auto",
              }}
            >
              {palette.colors.map((c) => (
                <Box
                  key={c}
                  title={c}
                  onClick={() => togglePaletteColor(c)}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "3px",
                    backgroundColor: c,
                    cursor: "pointer",
                    boxSizing: "border-box",
                    border: selectedSet.has(c)
                      ? "2px solid #fff"
                      : "1px solid rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "0.35em" }}>
              {colors.map((c, i) => (
                <Box
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "4px",
                    backgroundColor: c,
                    cursor: "pointer",
                    outline:
                      i === activeIndex
                        ? "2px solid #fff"
                        : "1px solid rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </Box>
            <HexColorPicker
              color={activeColor}
              onChange={(c) => {
                const next = colors.map((col, i) =>
                  i === activeIndex ? c : col,
                );
                setColors(next);
                commit({ targetColors: next });
              }}
            />
            <Box sx={{ display: "flex", gap: "0.5em" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => pushColors([...colors, activeColor])}
              >
                Add color
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={colors.length <= 1}
                onClick={() =>
                  pushColors(colors.filter((_, i) => i !== activeIndex))
                }
              >
                Remove color
              </Button>
            </Box>
          </>
        )}
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
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={modifier.outlineVisible}
              onChange={(e) => {
                commit.clear();
                onUpdate(index, {
                  ...modifierRef.current,
                  outlineVisible: e.target.checked,
                });
              }}
            />
          }
          label="Show outline"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={modifier.splitPerLayer}
              onChange={(e) => {
                commit.clear();
                onUpdate(index, {
                  ...modifierRef.current,
                  splitPerLayer: e.target.checked,
                });
              }}
            />
          }
          label="Separate layer per source layer"
        />
        <Button variant="contained" size="small" onClick={applyNow}>
          Apply
        </Button>
      </Box>
    </ModifierFrame>
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
      targetColors: ["#ff0000"],
      tolerance: 24,
      newLayerName: `Palette ${n}`,
      outlineVisible: true,
      splitPerLayer: false,
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
