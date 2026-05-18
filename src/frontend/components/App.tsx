import "./App.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { Box, Tab, Tabs, ThemeProvider, createTheme } from "@mui/material";
import { Animations } from "./Animations";
import { FileBar } from "./FileBar";
import { FileOperations } from "./FileOperations";
import { Layers } from "./Layers";
import { Modifiers } from "./Modifiers";
import React from "react";
import { SpritePreview } from "./SpritePrevew";
import { useSpriteStore } from "../state";

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
