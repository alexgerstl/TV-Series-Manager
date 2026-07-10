import { Box, Typography } from '@mui/material';

/** Placeholder — log search, filter, export, and clear are built in milestone M8.3. */
export function LogsPage(): JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Logs
      </Typography>
      <Typography color="text.secondary">
        Log search and filtering arrive in milestone M8.3.
      </Typography>
    </Box>
  );
}
