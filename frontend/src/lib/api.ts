const API_BASE = 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
    throw new Error(payload.detail ?? 'Request failed')
  }

  return response.json() as Promise<T>
}

export interface SessionSummary {
  session_token: string
  session_type: string
  status: string
  desktop_approved: boolean
  expires_at: string
}

export interface UserRecord {
  user_id: string
  name: string
  country_code: string
  phone_number: string
  face_photo_url: string | null
  biometric_supported: boolean
  biometric_registered: boolean
  phone_verified: boolean
  account_active: boolean
  created_at: string
}

export interface AuthResponse {
  message: string
  session: SessionSummary
  user: UserRecord
  access_token: string
  face_profile_key: string | null
  token_type: string
}

export interface OtpStartResponse {
  message: string
  session: SessionSummary
  expires_in_seconds: number
  otp: string | null
}

export interface FaceLoginResponse {
  message: string
  session: SessionSummary
  result: 'matched' | 'registration_required' | 'otp_fallback'
  user: UserRecord | null
  access_token: string | null
  face_profile_key: string | null
  token_type: string | null
}

export interface DesktopSessionResponse {
  message: string
  session: SessionSummary
  qr_url: string
}

export interface SessionStatusResponse {
  message: string
  session: SessionSummary
  requires_approval: boolean
}

export function createDesktopSession() {
  return request<DesktopSessionResponse>('/api/auth/desktop/session', { method: 'POST' })
}

export function createRegistrationSession() {
  return request<SessionStatusResponse>('/api/auth/registration/session', { method: 'POST' })
}

export function scanDesktopSession(sessionToken: string) {
  return request<SessionStatusResponse>('/api/auth/sessions/scan', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken, device_label: 'mobile' }),
  })
}

export function getSession(sessionToken: string) {
  return request<SessionStatusResponse>(`/api/auth/sessions/${sessionToken}`)
}

export function runFaceLogin(sessionToken: string, imageData: string, faceProfileKey: string | null) {
  return request<FaceLoginResponse>('/api/auth/mobile/face-login', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      image_data: imageData,
      face_profile_key: faceProfileKey,
    }),
  })
}

export async function uploadPhoto(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE}/api/upload/photo`, { method: 'POST', body: formData })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ detail: 'Photo upload failed' }))) as { detail?: string }
    throw new Error(payload.detail ?? 'Photo upload failed')
  }
  return response.json() as Promise<{
    message: string
    photo_url: string
    filename: string
    size_bytes: number
    content_type: string
  }>
}

export function sendRegistrationOtp(payload: {
  sessionToken: string
  name: string
  countryCode: string
  phoneNumber: string
  facePhotoUrl: string
  biometricSupported: boolean
  biometricRegistered: boolean
}) {
  return request<OtpStartResponse>('/api/auth/registration/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      session_token: payload.sessionToken,
      name: payload.name,
      country_code: payload.countryCode,
      phone_number: payload.phoneNumber,
      face_photo_url: payload.facePhotoUrl,
      biometric_supported: payload.biometricSupported,
      biometric_registered: payload.biometricRegistered,
    }),
  })
}

export function verifyRegistrationOtp(sessionToken: string, otp: string) {
  return request<AuthResponse>('/api/auth/registration/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken, otp }),
  })
}

export function sendLoginOtp(sessionToken: string, countryCode: string, phoneNumber: string) {
  return request<OtpStartResponse>('/api/auth/login/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      session_token: sessionToken,
      country_code: countryCode,
      phone_number: phoneNumber,
    }),
  })
}

export function verifyLoginOtp(sessionToken: string, otp: string) {
  return request<AuthResponse>('/api/auth/login/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken, otp }),
  })
}

export function approveDesktopSession(sessionToken: string) {
  return request<AuthResponse>('/api/auth/desktop/approve', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken }),
  })
}

export function verifyFingerprintLogin(sessionToken: string, verified: boolean) {
  return request<AuthResponse>('/api/auth/mobile/verify-fingerprint', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken, fingerprint_verified: verified }),
  })
}

export function getDashboard(sessionToken: string) {
  return request<{ message: string; user: UserRecord }>(`/api/users/dashboard/${sessionToken}`)
}
