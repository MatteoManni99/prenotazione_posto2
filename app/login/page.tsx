'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function login() {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error) {
      router.push('/booking')
    }
  }

  async function register() {
    const supabase = getSupabaseClient()
    await supabase.auth.signUp({
      email,
      password,
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl w-[400px] flex flex-col gap-4 shadow-xl">
        <h1 className="text-3xl font-bold">
          Login
        </h1>

        <input
          placeholder="Email"
          className="border p-3 rounded-lg"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          className="border p-3 rounded-lg"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="bg-black text-white p-3 rounded-lg"
        >
          Login
        </button>

        <button
          onClick={register}
          className="border p-3 rounded-lg"
        >
          Registrati
        </button>
      </div>
    </main>
  )
}