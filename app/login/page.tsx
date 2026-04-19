"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [captchaInput, setCaptchaInput] = useState("")
  const [error, setError] = useState("")
  const [captcha, setCaptcha] = useState({ question: "", answer: "" })

  useEffect(() => {
    if (localStorage.getItem("inventory-auth") === "true") {
      router.push("/dashboard")
      return
    }

    const a = Math.floor(Math.random() * 10) + 1
    const b = Math.floor(Math.random() * 10) + 1
    setCaptcha({ question: `${a} + ${b} = ?`, answer: (a + b).toString() })
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (captchaInput.trim() !== captcha.answer) {
      setError("Captcha is incorrect")
      return
    }

    // Simple hardcoded login for stability
    if (username === "admin" && password === "admin") {
      localStorage.setItem("inventory-auth", "true")
      router.push("/dashboard")
    } else {
      setError("Invalid username or password")
    }
  }

  useEffect(() => {
    if (localStorage.getItem("inventory-auth") === "true") {
      router.push("/dashboard")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold mb-1">Admin Login</h1>
        <p className="text-sm text-slate-500 mb-6">Please sign in to continue to the inventory dashboard. Use username <strong>admin</strong> and password <strong>admin</strong>.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Captcha: {captcha.question}</label>
            <input
              type="text"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="Enter the answer"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">Use admin/password and correct captcha to continue.</p>
      </div>
    </div>
  )
}
