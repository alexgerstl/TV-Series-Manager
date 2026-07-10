import { Box, Typography } from '@mui/material';

/** Placeholder — the full settings page (SRS §19) is built in milestone M8.1. */
export function SettingsPage(): JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      <Typography color="text.secondary">
        The full settings page arrives in milestone M8.1.
      </Typography>
    </Box>
  );
}
