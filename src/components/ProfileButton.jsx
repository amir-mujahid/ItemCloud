// src/components/ProfileButton.jsx
import { useEffect, useState } from 'react'
import { auth } from '../services/firebase'
import { Link } from 'react-router-dom'

export default function ProfileButton() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    return auth.onAuthStateChanged(setUser)
  }, [])

  if (!user) return null

  const letter = (user.displayName || user.email || '?')[0]?.toUpperCase()

  return (
    <Link
      to="/account"
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800"
      title="Account"
    >
      <div className="size-8 grid place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white font-semibold">
        {letter}
      </div>
      <span className="hidden sm:block text-sm">{user.displayName || user.email}</span>
    </Link>
  )
}
