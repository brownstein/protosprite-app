import React, { useMemo } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import { useSpriteStore } from "../state";

export function Animations(): React.ReactNode {
  const sprite = useSpriteStore((state) => state.currentSprite);
  const spriteCurrentAnimation = useSpriteStore((state) => state.currentAnimationName);
  const toggleAnimation = useSpriteStore((state) => state.toggleAnimationSelected);

  const animations = useMemo(() => sprite?.data.animations, [sprite]);

  if (!animations) return null;

  return (
    <List
      sx={{
        width: "100%",
        maxHeight: "100%",
        bgColor: "background.paper",
        overflowY: "scroll",
      }}
    >
      {animations.map((animation, i) => (
        <ListItem key={i} disablePadding>
          <ListItemButton onClick={() => toggleAnimation(animation.name)}>
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={spriteCurrentAnimation === animation.name}
                tabIndex={-1}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText id={animation.name} primary={animation.name} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
