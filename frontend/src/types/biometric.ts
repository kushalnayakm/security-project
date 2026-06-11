export type VerificationStep = 1 | 2 | 3

export type CameraStage = 'idle' | 'preview' | 'captured' | 'processing' | 'failed'

export interface CountryOption {
  code: string
  flag: string
  country: string
  minLength: number
  maxLength: number
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { flag: '🇮🇳', code: '+91', country: 'India', minLength: 10, maxLength: 10 },
  { flag: '🇺🇸', code: '+1', country: 'United States', minLength: 10, maxLength: 10 },
  { flag: '🇬🇧', code: '+44', country: 'United Kingdom', minLength: 10, maxLength: 11 },
  { flag: '🇦🇪', code: '+971', country: 'United Arab Emirates', minLength: 9, maxLength: 9 },
  { flag: '🇸🇬', code: '+65', country: 'Singapore', minLength: 8, maxLength: 8 },
]
