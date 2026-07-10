import { Box, CssBaseline, Tab, Tabs, ThemeProvider, Typography, createTheme } from '@mui/material';
import type { SyntheticEvent } from 'react';

import { LogsPage } from './pages/LogsPage';
import { LookupPage } from './pages/LookupPage';
import { MonitorPage } from './pages/MonitorPage';
import { NasSyncPage } from './pages/NasSyncPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToolsPage } from './pages/ToolsPage';
import type { TabKey } from './store';
import { useUiStore } from './store';

const theme = createTheme();

interface TabDefinition {
  key: TabKey;
  label: string;
  Page: () => JSX.Element;
}

// Order and labels per SRS §20.
const TABS: TabDefinition[] = [
  { key: 'monitor', label: 'Monitor', Page: MonitorPage },
  { key: 'lookup', label: 'Lookup', Page: LookupPage },
  { key: 'nasSync', label: 'NAS Sync', Page: NasSyncPage },
  { key: 'tools', label: 'Tools', Page: ToolsPage },
  { key: 'settings', label: 'Settings', Page: SettingsPage },
  { key: 'logs', label: 'Logs', Page: LogsPage },
];

/**
 * Root component: the six-tab shell (architecture.md §9 M1.8). Each tab's
 * real content is built out in its own milestone — see the placeholder text
 * inside each `pages/*.tsx` component.
 */
export function App(): JSX.Element {
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  const ActivePage = TABS.find((tab) => tab.key === activeTab)?.Page ?? MonitorPage;

  const handleTabChange = (_event: SyntheticEvent, value: TabKey): void => {
    setActiveTab(value);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Typography variant="h6" sx={{ px: 2, pt: 2 }}>
          TV Series Manager
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Application sections">
          {TABS.map((tab) => (
            <Tab key={tab.key} label={tab.label} value={tab.key} />
          ))}
        </Tabs>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <ActivePage />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
