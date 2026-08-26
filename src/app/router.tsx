import { Navigate, createHashRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { LibraryPage } from '../features/library/pages/LibraryPage'
import { ComparatorPage } from '../features/comparator/pages/ComparatorPage'
import { ReconstitutePage } from '../features/reconstitution/pages/ReconstitutePage'
import { ProtocolsPage } from '../features/protocols/pages/ProtocolsPage'
import { HistoryPage } from '../features/history/pages/HistoryPage'
import { SettingsPage } from '../features/settings/pages/SettingsPage'
import { SpikeCspPage } from '../tools/spike-csp/SpikeCspPage'
import { NotFoundPage } from './NotFoundPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/biblioteca" replace /> },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'meia-vida', element: <ComparatorPage /> },
      { path: 'reconstituir', element: <ReconstitutePage /> },
      { path: 'protocolos', element: <ProtocolsPage /> },
      { path: 'historico', element: <HistoryPage /> },
      { path: 'ajustes', element: <SettingsPage /> },
      { path: 'dev/spike-csp', element: <SpikeCspPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
