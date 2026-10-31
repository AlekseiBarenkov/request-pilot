import 'antd/dist/reset.css'
import './styles/global.css'

import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'

dayjs.locale('ru')

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Не найден корневой элемент приложения.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
