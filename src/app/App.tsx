import { App as AntApp, ConfigProvider as AntConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { HistoryPage } from '../pages/HistoryPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProcessPage } from '../pages/ProcessPage'
import { SavedAnalysisPage } from '../pages/SavedAnalysisPage'
import { ConfigProvider } from './ConfigProvider'
import { Layout } from './Layout'
import { appTheme } from './theme'

export function App() {
  return (
    <ConfigProvider>
      <AntConfigProvider locale={ruRU} theme={appTheme}>
        <AntApp>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<ProcessPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="history/:id" element={<SavedAnalysisPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AntApp>
      </AntConfigProvider>
    </ConfigProvider>
  )
}
