import type { AnalysisMode, ProviderId } from '../../shared/constants'

export function ResultModeNotice({ mode, provider }: { mode: AnalysisMode; provider: ProviderId }) {
  if (mode === 'demo') {
    return (
      <div className="notice notice--demo" role="note">
        <strong>Подготовленный пример.</strong> Модель не вызывалась.
      </div>
    )
  }

  return (
    <div className="notice notice--live" role="note">
      {provider === 'deepseek' ? 'Разбор DeepSeek' : 'Тестовый режим'}
    </div>
  )
}
