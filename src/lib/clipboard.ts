export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Буфер обмена недоступен.')
  }

  await navigator.clipboard.writeText(text)
}
