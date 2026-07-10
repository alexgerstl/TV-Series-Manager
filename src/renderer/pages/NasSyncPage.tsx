import { Box, Typography } from '@mui/material';

/** Placeholder — NAS status, compare, and copy/move are built in milestone M6. */
export function NasSyncPage(): JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        NAS Sync
      </Typography>
      <Typography color="text.secondary">
        NAS sync status, compare, and copy/move arrive in milestone M6.
      </Typography>
    </Box>
  );
}
