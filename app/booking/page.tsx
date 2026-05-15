'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

type Seat = {
  id: number
  seat_number: string
  row_letter: string
  seat_index: number
  block: string
  booked: boolean
}

type BookingStep = 'map' | 'form' | 'done'

const SEDI = ['Pavarolo', 'Marentino', 'Sciolze', 'Andezeno', 'Castelnuovo']

const FRONT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const BACK_ROWS  = ['I', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']

export default function BookingPage() {
  const [seats, setSeats] = useState<Seat[]>([])
  const [selected, setSelected] = useState<Seat[]>([])
  const [step, setStep] = useState<BookingStep>('map')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [sede, setSede] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadSeats() {
    const supabase = getSupabaseClient()
    const { data: seatsData } = await supabase
      .from('seats')
      .select('*, bookings(id)')
      .order('row_letter')
      .order('seat_index')

    if (seatsData) {
      setSeats(
        seatsData.map((s: any) => ({
          ...s,
          booked: Array.isArray(s.bookings) && s.bookings.length > 0,
        }))
      )
    }
  }

  useEffect(() => { loadSeats() }, [])

  function toggleSeat(seat: Seat) {
    if (seat.booked) return
    setSelected(prev =>
      prev.find(s => s.id === seat.id)
        ? prev.filter(s => s.id !== seat.id)
        : [...prev, seat]
    )
  }

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !sede) {
      setError('Compila tutti i campi.')
      return
    }
    setSubmitting(true)
    setError('')
    const supabase = getSupabaseClient()
    const rows = selected.map(s => ({
      seat_id: s.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      sede,
    }))
    const { error: dbErr } = await supabase.from('bookings').insert(rows)
    setSubmitting(false)
    if (dbErr) {
      setError('Errore durante la prenotazione. Riprova.')
      return
    }
    setStep('done')
  }

  function renderBlock(rows: string[]) {
    return rows.map(row => {
      const rowSeats = seats.filter(s => s.row_letter === row)
      return (
        <div key={row} className="flex items-center gap-1 mb-1">
          <span className="w-5 text-center text-xs font-bold text-amber-400 font-mono">{row}</span>
          <div className="flex gap-1">
            {rowSeats.map(seat => {
              const isSelected = !!selected.find(s => s.id === seat.id)
              let cls = 'w-7 h-7 rounded text-xs font-bold transition-all duration-150 flex items-center justify-center cursor-pointer select-none '
              if (seat.booked) {
                cls += 'bg-rose-700 text-rose-300 cursor-not-allowed opacity-70'
              } else if (isSelected) {
                cls += 'bg-amber-400 text-zinc-900 shadow-lg scale-110 ring-2 ring-amber-200'
              } else {
                cls += 'bg-emerald-700 hover:bg-emerald-500 text-white hover:scale-105'
              }
              return (
                <button
                  key={seat.id}
                  className={cls}
                  disabled={seat.booked}
                  onClick={() => toggleSeat(seat)}
                  title={seat.seat_number}
                >
                  {seat.seat_index}
                </button>
              )
            })}
          </div>
        </div>
      )
    })
  }

  if (step === 'done') {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🎭</div>
          <h1 className="text-3xl font-bold text-amber-400 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Prenotazione Confermata!
          </h1>
          <p className="text-zinc-300 mb-2">
            Benvenuto/a <span className="text-white font-semibold">{firstName} {lastName}</span>
          </p>
          <p className="text-zinc-400 mb-6">
            Sede: <span className="text-amber-300">{sede}</span>
          </p>
          <div className="bg-zinc-800 rounded-xl p-4 mb-8">
            <p className="text-zinc-400 text-sm mb-2">Posti prenotati:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {selected.map(s => (
                <span key={s.id} className="bg-amber-400 text-zinc-900 font-bold px-3 py-1 rounded-full text-sm">
                  {s.seat_number}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setStep('map'); setSelected([]); setFirstName(''); setLastName(''); setSede(''); loadSeats() }}
            className="bg-amber-400 text-zinc-900 font-bold px-8 py-3 rounded-xl hover:bg-amber-300 transition-colors"
          >
            Torna alla Mappa
          </button>
        </div>
      </main>
    )
  }

  if (step === 'form') {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => setStep('map')} className="text-zinc-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
            ← Torna alla mappa
          </button>
          <h1 className="text-3xl font-bold text-amber-400 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            I tuoi dati
          </h1>
          <p className="text-zinc-400 mb-6 text-sm">
            Posti selezionati:{' '}
            {selected.map(s => (
              <span key={s.id} className="inline-block bg-zinc-700 text-amber-300 font-mono px-2 py-0.5 rounded mr-1 text-xs">{s.seat_number}</span>
            ))}
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Nome *</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Mario"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Cognome *</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Rossi"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Sede di Danza *</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors appearance-none cursor-pointer"
                value={sede}
                onChange={e => setSede(e.target.value)}
              >
                <option value="">— Seleziona la sede —</option>
                {SEDI.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {error && <p className="text-rose-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-amber-400 text-zinc-900 font-bold py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? 'Prenotazione in corso…' : 'Conferma Prenotazione'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Step: map
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-amber-400 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            🎭 Teatro — Prenotazione Posti
          </h1>
          <p className="text-zinc-400 text-sm">Seleziona uno o più posti e prosegui</p>
        </div>

        {/* Legenda */}
        <div className="flex gap-6 justify-center mb-8 text-sm">
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-emerald-700 inline-block"></span><span className="text-zinc-300">Disponibile</span></div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-amber-400 inline-block"></span><span className="text-zinc-300">Selezionato</span></div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-rose-700 inline-block"></span><span className="text-zinc-300">Occupato</span></div>
        </div>

        {/* Palco */}
        <div className="bg-gradient-to-r from-amber-900/40 via-amber-700/30 to-amber-900/40 border border-amber-600/40 text-amber-300 text-center py-3 rounded-xl mb-8 font-bold tracking-[0.3em] uppercase text-sm">
          ★ PALCO ★
        </div>

        {/* Blocco A-H */}
        <div className="mb-8">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 text-center">Blocco Anteriore — File A·H</p>
          <div className="overflow-x-auto flex justify-center">
            <div>{renderBlock(FRONT_ROWS)}</div>
          </div>
        </div>

        {/* Separatore */}
        <div className="border-t border-dashed border-zinc-700 my-6 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-4 text-zinc-500 text-xs uppercase tracking-widest">
            Corridoio
          </span>
        </div>

        {/* Blocco I-S */}
        <div className="mb-10">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 text-center">Blocco Posteriore — File I·S</p>
          <div className="overflow-x-auto flex justify-center">
            <div>{renderBlock(BACK_ROWS)}</div>
          </div>
        </div>

        {/* Numero colonne */}
        <div className="flex justify-center gap-1 mb-8 pl-6">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="w-7 text-center text-xs text-zinc-600 font-mono">{i + 1}</span>
          ))}
        </div>
      </div>

      {/* Bottom bar posti selezionati */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1 flex-1">
              {selected.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSeat(s)}
                  className="bg-amber-400 text-zinc-900 font-bold px-2 py-0.5 rounded-full text-xs hover:bg-rose-400 transition-colors"
                  title="Clicca per deselezionare"
                >
                  {s.seat_number} ×
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('form')}
              className="bg-amber-400 text-zinc-900 font-bold px-6 py-2.5 rounded-xl hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              Prenota {selected.length} {selected.length === 1 ? 'posto' : 'posti'} →
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
