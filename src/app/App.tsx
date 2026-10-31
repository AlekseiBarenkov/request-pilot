import { App as AntApp, ConfigProvider as AntConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { HistoryPage } from '../pages/HistoryPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProcessPage } from '../pages/ProcessPage'
import { SavedAnalysisPage } from '../pages/SavedAnalysisPage'
import { ConfigProvider } from './ConfigProvider'
import { Layout } from './Layout'
import { appTheme } from './theme'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <ProcessPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'history/:id', element: <SavedAnalysisPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return (
    <ConfigProvider>
      <AntConfigProvider locale={ruRU} theme={appTheme}>
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </AntConfigProvider>
    </ConfigProvider>
  )
}
