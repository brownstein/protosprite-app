import "./App.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { ThemeProvider, createTheme } from "@mui/material";
import { Layers } from "./Layers";
import { Modifiers } from "./Modifiers";
import { PaletteDisplay } from "./PaletteDisplay";
import React from "react";
import { SpritePreview } from "./SpritePrevew";
import { TopBar } from "./TopBar";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

export function App(): React.ReactElement {
  return (
    <div className="app">
      <ThemeProvider theme={darkTheme}>
        <TopBar />
        <div className="preview-row">
          <SpritePreview />
          <PaletteDisplay />
        </div>
        <div className="config">
          <div className="config-row">
            <Layers />
            <Modifiers />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
