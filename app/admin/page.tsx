'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const [seats, setSeats] = useState<any[]>([])

  async function loadSeats() {
    const supabase = getSupabaseClient()
    const { data } = await supabase.from('seats').select('*')
    setSeats(data || [])
  }

  async function freeSeat(id: number) {
    const supabase = getSupabaseClient()
    await supabase
      .from('seats')
      .update({ is_reserved: false, reserved_by: null, reserved_at: null })
      .eq('id', id)
    loadSeats()
  }

  useEffect(() => {
    loadSeats()
  }, [])

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold mb-10">
        Dashboard Admin
      </h1>

      <div className="grid gap-4">
        {seats.map((seat) => (
          <div
            key={seat.id}
            className="border p-4 rounded-xl flex justify-between"
          >
            <div>
              {seat.seat_number}
            </div>

            <div>
              {seat.is_reserved ? 'Prenotato' : 'Libero'}
            </div>

            {seat.is_reserved && (
              <button
                onClick={() => freeSeat(seat.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg"
              >
                Libera
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}