import type { SessionSummary, UserRecord } from './api'

const IDENTITY_KEY = 'did.identity'
const SESSION_KEY = 'did.session'

export interface StoredIdentity {
  userId: string
  name: string
  countryCode: string
  phoneNumber: string
  faceProfileKey: string | null
  facePhotoUrl: string | null
  biometricSupported: boolean
  biometricRegistered: boolean
}

export interface StoredSession {
  sessionToken: string
  accessToken: string
  sessionType: string
}

export function saveIdentity(user: UserRecord, faceProfileKey: string | null) {
  const identity: StoredIdentity = {
    userId: user.user_id,
    name: user.name,
    countryCode: user.country_code,
    phoneNumber: user.phone_number,
    faceProfileKey,
    facePhotoUrl: user.face_photo_url,
    biometricSupported: user.biometric_supported,
    biometricRegistered: user.biometric_registered,
  }
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export function loadIdentity(): StoredIdentity | null {
  const raw = window.localStorage.getItem(IDENTITY_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredIdentity
  } catch {
    window.localStorage.removeItem(IDENTITY_KEY)
    return null
  }
}

export function clearIdentity() {
  window.localStorage.removeItem(IDENTITY_KEY)
}

export function saveSession(session: SessionSummary, accessToken: string) {
  const payload: StoredSession = {
    sessionToken: session.session_token,
    accessToken,
    sessionType: session.session_type,
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
}

export function loadSession(): StoredSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY)
}
