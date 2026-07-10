import { Box, Typography } from '@mui/material';

/** Placeholder — the live Incoming grid is built in milestone M2.4. */
export function MonitorPage(): JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Monitor
      </Typography>
      <Typography color="text.secondary">
        Incoming file grid arrives in milestone M2.4.
      </Typography>
    </Box>
  );
}
