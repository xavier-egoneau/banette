export {}

export interface BanetteApiInfo {
  enabled: boolean
  host: string
  port: number
  baseUrl: string
  storagePath: string
}

declare global {
  interface Window {
    electron: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>
    }
  }
}
