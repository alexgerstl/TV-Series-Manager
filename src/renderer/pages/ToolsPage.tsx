import { Box, Typography } from '@mui/material';

/** Placeholder — external tool launchers and workflow shortcuts are built in milestone M5. */
export function ToolsPage(): JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Tools
      </Typography>
      <Typography color="text.secondary">
        External tool launchers arrive in milestone M5.
      </Typography>
    </Box>
  );
}
