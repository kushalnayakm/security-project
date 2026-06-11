import { useEffect, useState } from 'react'
import { CheckCircle2, Fingerprint, Phone, ScanFace } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../../components/Button/Button'
import { getDashboard, type UserRecord } from '../../lib/api'
import { clearIdentity, clearSession, loadSession } from '../../lib/storage'

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [user, setUser] = useState<UserRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionToken = searchParams.get('session') ?? loadSession()?.sessionToken
    if (!sessionToken) {
      setError('No authenticated session was found.')
      return
    }

    void getDashboard(sessionToken)
      .then((response) => setUser(response.user))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load dashboard.'))
  }, [searchParams])

  const statusItems = user
    ? [
        { label: 'Face Verified', active: Boolean(user.face_photo_url), icon: ScanFace },
        { label: 'Phone Verified', active: user.phone_verified, icon: Phone },
        { label: 'Biometric Registered', active: user.biometric_registered, icon: Fingerprint },
      ]
    : []

  return (
    <div className="min-h-dvh bg-slate-100 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-6">
          {error ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-rose-600">{error}</p>
              <Button onClick={() => navigate('/')}>Back</Button>
            </div>
          ) : !user ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] bg-slate-950 text-2xl font-semibold text-white">
                    {user.face_photo_url ? (
                      <img
                        src={`http://localhost:8000/${user.face_photo_url}`}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Profile</p>
                    <h1 className="text-2xl font-semibold text-slate-950">{user.name}</h1>
                    <p className="mt-1 text-sm text-slate-600">{user.country_code} {user.phone_number}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {statusItems.map(({ label, active, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                    </div>
                    {active && <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2.2} aria-hidden="true" />}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => navigate('/')}>Open Access</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearSession()
                    clearIdentity()
                    navigate('/', { replace: true })
                  }}
                >
                  Clear Local Identity
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
