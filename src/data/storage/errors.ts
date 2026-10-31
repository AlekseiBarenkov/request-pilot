export class StorageUnavailableError extends Error {
  constructor(message = 'Хранилище браузера недоступно.') {
    super(message)
    this.name = 'StorageUnavailableError'
  }
}

export class StorageCorruptError extends Error {
  constructor(message = 'История повреждена или создана в несовместимой версии.') {
    super(message)
    this.name = 'StorageCorruptError'
  }
}

export class StorageLimitError extends Error {
  constructor(message = 'Лимит истории - 100 записей. Удалите старые, чтобы сохранить новый разбор.') {
    super(message)
    this.name = 'StorageLimitError'
  }
}
