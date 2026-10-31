import { Button, Result } from 'antd'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page">
      <Result
        status="404"
        title="Страница не найдена"
        subTitle="Такой страницы нет или она была перемещена."
        extra={
          <Link to="/">
            <Button type="primary">К обработке</Button>
          </Link>
        }
      />
    </div>
  )
}
