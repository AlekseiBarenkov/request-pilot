import type { SavedAnalysis } from '../../../shared/schemas/saved'

export type ExportEnvelope = {
  app: 'RequestPilot'
  version: 1
  exportedAt: string
  record: SavedAnalysis
}

export function createExportEnvelope(record: SavedAnalysis, now = new Date()): ExportEnvelope {
  return {
    app: 'RequestPilot',
    version: 1,
    exportedAt: now.toISOString(),
    record,
  }
}
