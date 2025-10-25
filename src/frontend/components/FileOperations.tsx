import { Box, Button } from "@mui/material";

export function FileOperations() {
  return (
    <Box sx={{
      flexGrow: "1",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1em",
    }}>
      <Button variant="contained">Load</Button>
      <Button variant="contained">Save</Button>
    </Box>
  );
}
