'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

export default function BookingPage() {
  const [seats, setSeats] = useState<any[]>([])

  async function loadSeats() {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('seats')
      .select('*')
      .order('seat_number')

    setSeats(data || [])
  }

  async function reserveSeat(seatId: number) {
    const supabase = getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase
      .from('seats')
      .update({
        is_reserved: true,
        reserved_by: user?.id,
        reserved_at: new Date(),
      })
      .eq('id', seatId)

    loadSeats()
  }

  useEffect(() => {
    loadSeats()
  }, [])

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-10">
      <h1 className="text-4xl font-bold text-center mb-10">
        Seleziona il tuo posto
      </h1>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white text-black text-center py-4 rounded-xl mb-10 font-bold">
          PALCO
        </div>

        <div className="grid grid-cols-10 gap-4">
          {seats.map((seat) => (
            <button
              key={seat.id}
              disabled={seat.is_reserved}
              onClick={() => reserveSeat(seat.id)}
              className={`
                p-4 rounded-lg font-bold
                ${seat.is_reserved
                  ? 'bg-red-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-400'}
              `}
            >
              {seat.seat_number}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}