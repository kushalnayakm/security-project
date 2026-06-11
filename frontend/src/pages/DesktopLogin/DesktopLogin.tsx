import { LaptopMinimal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button/Button'

export default function DesktopLogin() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-6 sm:px-6">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <LaptopMinimal className="h-5 w-5" />
        </div>

        <h1 className="mt-4 text-xl font-semibold text-slate-950">Desktop Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Desktop QR login will be implemented later.</p>

        <div className="mt-6">
          <Button fullWidth onClick={() => navigate('/')}>
            Open Mobile Access
          </Button>
        </div>
      </section>
    </div>
  )
}

// TODO: Implement desktop QR session creation when the desktop login flow is ready.
// TODO: Implement mobile approval handoff for desktop sessions.
