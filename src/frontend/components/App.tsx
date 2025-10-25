import React from "react";
import { Box, createTheme, Tab, Tabs, ThemeProvider } from "@mui/material";

import "./App.css";
import { Layers } from "./Layers";
import { FileBar } from "./FileBar";
import { SpritePreview } from "./SpritePrevew";
import { Animations } from "./Animations";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { useSpriteStore } from "../state";
import { FileOperations } from "./FileOperations";
import { Modifiers } from "./Modifiers";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

export function App(): React.ReactElement {
  const currentTab = useSpriteStore((state) => state.currentTab);
  const setCurrentTab = useSpriteStore((state) => state.setCurrentTab);

  return (
    <div className="app">
      <ThemeProvider theme={darkTheme}>
        <FileBar />
        <SpritePreview />
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={currentTab}
            onChange={(_e, v) => setCurrentTab(v)}
            aria-label="basic tabs example"
          >
            <Tab label="Layers" value="layers" />
            <Tab label="Animations" value="animations" />
            <Tab label="File" value="file" />
          </Tabs>
        </Box>
        <div className="config">
          {currentTab === "layers" && (
            <div className="config-row">
              <Layers />
              <Modifiers />
            </div>
          )}
          {currentTab === "animations" && <Animations />}
          {currentTab === "file" && <FileOperations />}
        </div>
      </ThemeProvider>
    </div>
  );
}
