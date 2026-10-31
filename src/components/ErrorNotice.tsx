import { Alert, Button } from 'antd'

export function ErrorNotice({
  title = 'Не удалось выполнить запрос',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <Alert
      type="error"
      showIcon
      message={title}
      description={message}
      action={onRetry ? <Button onClick={onRetry}>Повторить</Button> : undefined}
    />
  )
}
