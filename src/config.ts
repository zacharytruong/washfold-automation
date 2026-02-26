/**
 * Type-safe environment configuration with validation
 * Fails fast if required variables are missing
 */

function getEnvVar(key: string, required = true): string {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value ?? ''
}

function getEnvVarAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (!value) {
    return defaultValue
  }
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    throw new TypeError(`Environment variable ${key} must be a number`)
  }
  return parsed
}

export interface Config {
  // Pancake POS
  pancakeApiKey: string
  pancakeShopId: string

  // Botcake (WhatsApp)
  botcakeAccessToken: string
  botcakePageId: string

  // Google Sheets
  googleSheetsId: string
  googleServiceAccountJson: string

  // Security
  webhookSecret: string
  logViewerSecret: string

  // Server
  port: number
}

let cachedConfig: Config | null = null

/**
 * Get PORT only - safe to call without full env validation
 */
export function getPort(): number {
  const value = process.env.PORT
  if (!value) {
    return 3000
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 3000 : parsed
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = {
    // Pancake POS
    pancakeApiKey: getEnvVar('PANCAKE_API_KEY'),
    pancakeShopId: getEnvVar('PANCAKE_SHOP_ID'),

    // Botcake (WhatsApp)
    botcakeAccessToken: getEnvVar('BOTCAKE_ACCESS_TOKEN'),
    botcakePageId: getEnvVar('BOTCAKE_PAGE_ID'),

    // Google Sheets
    googleSheetsId: getEnvVar('GOOGLE_SHEETS_ID'),
    googleServiceAccountJson: getEnvVar('GOOGLE_SERVICE_ACCOUNT_JSON'),

    // Security
    webhookSecret: getEnvVar('WEBHOOK_SECRET'),
    logViewerSecret: getEnvVar('LOG_VIEWER_SECRET', false),

    // Server
    port: getEnvVarAsNumber('PORT', 3000),
  }

  return cachedConfig
}

/**
 * Validate config at startup - call this early to fail fast
 */
export function validateConfig(): void {
  getConfig()
  console.log('✓ Environment configuration validated')
}
