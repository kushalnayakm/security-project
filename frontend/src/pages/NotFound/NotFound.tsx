import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">404</p>
      <h1 className="text-3xl font-semibold tracking-[-0.04em]">Route not found</h1>
      <p className="max-w-md text-sm leading-6 text-slate-300">
        The requested screen does not exist in the biometric workflow. Return home to start a QR session or desktop login.
      </p>
      <Button onClick={() => navigate('/')}>Back Home</Button>
    </div>
  )
}
