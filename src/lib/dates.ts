import dayjs from 'dayjs'

export function formatDateTime(isoDate: string): string {
  return dayjs(isoDate).format('DD.MM.YYYY, HH:mm')
}
