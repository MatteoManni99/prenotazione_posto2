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
  const [pdfLoading, setPdfLoading] = useState(false)

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

  async function downloadPDF() {
    setPdfLoading(true)
    try {
      // Dynamic import — avoids SSR errors on Next.js
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const pageH = 297
      const margin = 20

      // Background
      doc.setFillColor(24, 24, 27)
      doc.rect(0, 0, pageW, pageH, 'F')

      // Top amber bar
      doc.setFillColor(251, 191, 36)
      doc.rect(0, 0, pageW, 6, 'F')

      // Title
      doc.setFont('times', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(251, 191, 36)
      doc.text('Conferma di Prenotazione', pageW / 2, 30, { align: 'center' })

      // Subtitle
      doc.setFont('times', 'italic')
      doc.setFontSize(13)
      doc.setTextColor(161, 161, 170)
      doc.text('Saggio di Fine Anno — Teatro del Colle Don Bosco — 9 Giugno 2026', pageW / 2, 40, { align: 'center' })

      // Divider
      doc.setDrawColor(251, 191, 36)
      doc.setLineWidth(0.5)
      doc.line(margin, 47, pageW - margin, 47)

      // Info card
      doc.setFillColor(39, 39, 42)
      doc.roundedRect(margin, 54, pageW - margin * 2, 56, 4, 4, 'F')

      const labelX = margin + 10
      const valueX = margin + 52
      let y = 68

      const infoRows: [string, string][] = [
        ['Nome:', `${firstName} ${lastName}`],
        ['Data evento:', '9 Giugno 2026'],
        ['Orario:', '20:15'],
      ]

      for (const [label, value] of infoRows) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(161, 161, 170)
        doc.text(label, labelX, y)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.setTextColor(255, 255, 255)
        doc.text(value, valueX, y)
        y += 12
      }

      // Seats heading
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(251, 191, 36)
      doc.text('Posti Prenotati', margin, 122)

      doc.setDrawColor(63, 63, 70)
      doc.setLineWidth(0.3)
      doc.line(margin, 125, pageW - margin, 125)

      // Seat badges
      const seatNumbers = selected.map(s => s.seat_number)
      const badgeW = 22
      const badgeH = 10
      const gap = 4
      const perRow = Math.floor((pageW - margin * 2 + gap) / (badgeW + gap))
      let sx = margin
      let sy = 130

      seatNumbers.forEach((num, i) => {
        if (i > 0 && i % perRow === 0) {
          sx = margin
          sy += badgeH + 4
        }
        doc.setFillColor(251, 191, 36)
        doc.roundedRect(sx, sy, badgeW, badgeH, 2, 2, 'F')
        doc.setFont('courier', 'bold')
        doc.setFontSize(16)
        doc.setTextColor(24, 24, 27)
        doc.text(num, sx + badgeW / 2, sy + 6.5, { align: 'center' })
        sx += badgeW + gap
      })

      // Note box
      const noteY = Math.max(sy + badgeH + 14, 178)
      doc.setFillColor(39, 39, 42)
      doc.roundedRect(margin, noteY, pageW - margin * 2, 22, 4, 4, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(161, 161, 170)
      doc.text(
        "Presentare questo documento (stampato o digitale) per il ritiro del biglietto effettivo.",
        pageW / 2, noteY + 8, { align: 'center' }
      )

      // Bottom bar
      doc.setFillColor(251, 191, 36)
      doc.rect(0, pageH - 6, pageW, 6, 'F')

      // Timestamp
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(63, 63, 70)
      const now = new Date()
      doc.text(
        `Generato il ${now.toLocaleDateString('it-IT')} alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
        pageW / 2, pageH - 10, { align: 'center' }
      )

      doc.save(`prenotazione_${lastName}_${firstName}.pdf`)
    } catch (e) {
      console.error('PDF error', e)
      alert('Errore nella generazione del PDF. Riprova.')
    }
    setPdfLoading(false)
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

  // ── DONE ────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <div className="text-6xl mb-6"></div>
          <h1 className="text-3xl font-bold text-amber-400 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Prenotazione Confermata!
          </h1>
          <p className="text-zinc-300 mb-2">
            <span className="text-white font-semibold">{firstName} {lastName}</span>
          </p>
          <p className="text-zinc-400 mb-6">
            Sede: <span className="text-amber-300">{sede}</span>
          </p>

          <div className="bg-zinc-800 rounded-xl p-4 mb-6">
            <p className="text-zinc-400 text-sm mb-3">Posti prenotati:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {selected.map(s => (
                <span key={s.id} className="bg-amber-400 text-zinc-900 font-bold px-3 py-1 rounded-full text-xl font-mono">
                  {s.seat_number}
                </span>
              ))}
            </div>
          </div>

          {/* PDF Button */}
          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="w-full bg-amber-400 text-zinc-900 font-bold px-8 py-3.5 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
          >
            {pdfLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Generazione PDF…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                Scarica la tua prenotazione in PDF
              </>
            )}
          </button>

          <button
            onClick={() => { setStep('map'); setSelected([]); setFirstName(''); setLastName(''); setSede(''); loadSeats() }}
            className="w-full text-zinc-500 hover:text-zinc-300 py-2 text-sm transition-colors"
          >
            Torna alla mappa →
          </button>
        </div>
      </main>
    )
  }

  // ── FORM ─────────────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button onClick={() => setStep('map')} className="text-zinc-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
            ← Torna alla mappa
          </button>
          <h1 className="text-3xl font-bold text-amber-400 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Dati Allievo
          </h1>
          <p className="text-zinc-400 mb-6 text-sm">
            Posti selezionati:{' '}
            {selected.map(s => (
              <span key={s.id} className="inline-block bg-zinc-700 text-amber-300 font-mono px-2 py-0.5 rounded mr-1 text-xs">{s.seat_number}</span>
            ))}
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Nome Allievo*</label>
              <input
                className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Mario"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm block mb-1">Cognome Allievo*</label>
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

  // ── MAP ───────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-amber-400 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Prenotazione Posti
          </h1>
          <p className="text-2xl font-bold text-amber-400 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            9 Giugno 2026
          </p>
          <p className="text-zinc-400 text-sm">Seleziona uno o più posti e prosegui</p>
        </div>

        <div className="flex gap-6 justify-center mb-8 text-sm">
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-emerald-700 inline-block"></span><span className="text-zinc-300">Disponibile</span></div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-amber-400 inline-block"></span><span className="text-zinc-300">Selezionato</span></div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-rose-700 inline-block"></span><span className="text-zinc-300">Occupato</span></div>
        </div>

        <div className="bg-gradient-to-r from-zinc-800/60 via-zinc-600/40 to-zinc-800/60 border border-zinc-500/40 text-zinc-300 text-center py-3 rounded-xl mb-8 font-bold tracking-[0.3em] uppercase text-sm">
          PALCO
        </div>

        <div className="mb-8">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 text-center">Blocco Anteriore — File A·H</p>
          {/* <div className="overflow-x-auto flex justify-center">
            <div>{renderBlock(FRONT_ROWS)}</div>
          </div> */}
          <div className="overflow-x-auto touch-pan-x">
            <div className="min-w-max flex justify-center px-4">
              <div>{renderBlock(FRONT_ROWS)}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-zinc-700 my-6 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-4 text-zinc-500 text-xs uppercase tracking-widest">
            Corridoio
          </span>
        </div>

        <div className="mb-10">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 text-center">Blocco Posteriore — File I·S</p>
          {/* <div className="overflow-x-auto flex justify-center">
            <div>{renderBlock(BACK_ROWS)}</div>
          </div> */}
          <div className="overflow-x-auto touch-pan-x">
            <div className="min-w-max flex justify-center px-4">
              <div>{renderBlock(BACK_ROWS)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-1 mb-8 pl-6">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="w-7 text-center text-xs text-zinc-600 font-mono">{i + 1}</span>
          ))}
        </div>
      </div>

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
