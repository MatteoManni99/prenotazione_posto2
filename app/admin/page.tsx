'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

const ADMIN_PASSWORD = 'Ares?'

const SEDI = ['Pavarolo', 'Marentino', 'Villanova', 'Andezeno', 'Castelnuovo']

const FRONT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const BACK_ROWS  = ['I', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']
const ALL_ROWS = [...FRONT_ROWS, ...BACK_ROWS]

type Seat = {
  id: number
  seat_number: string
  row_letter: string
  seat_index: number
  block: string
}

type Booking = {
  id: number
  seat_id: number
  first_name: string
  last_name: string
  sede: string
  created_at: string
  seats: {
    seat_number: string
    row_letter: string
    block: string
  }
}

type EditState = {
  id: number
  first_name: string
  last_name: string
  sede: string
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState(false)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [seats, setSeats] = useState<Seat[]>([])
  const [view, setView] = useState<'table' | 'map'>('table')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [mapSeatId, setMapSeatId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sedeFilter, setSedeFilter] = useState('')

  const [editing, setEditing] = useState<EditState | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  function handleLogin() {
    if (pwd === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwdError(false)
    } else {
      setPwdError(true)
    }
  }

  async function loadBookings() {
    setLoading(true)
    const supabase = getSupabaseClient()
    const [{ data }, { data: seatsData }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, seats(seat_number, row_letter, block)')
        .order('seats(row_letter)', { ascending: true }),
      supabase
        .from('seats')
        .select('id, seat_number, row_letter, seat_index, block')
        .order('row_letter')
        .order('seat_index'),
    ])
    setBookings((data as Booking[]) || [])
    setSeats((seatsData as Seat[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (authed) loadBookings()
  }, [authed])

  async function saveEdit() {
    if (!editing) return
    setSavingId(editing.id)
    const supabase = getSupabaseClient()
    await supabase
      .from('bookings')
      .update({
        first_name: editing.first_name,
        last_name: editing.last_name,
        sede: editing.sede,
      })
      .eq('id', editing.id)
    setSavingId(null)
    setEditing(null)
    loadBookings()
  }

  async function deleteBooking(id: number) {
    setDeletingId(id)
    const supabase = getSupabaseClient()
    await supabase.from('bookings').delete().eq('id', id)
    setDeletingId(null)
    setConfirmDelete(null)
    loadBookings()
  }

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    const nameMatch =
      b.first_name.toLowerCase().includes(q) ||
      b.last_name.toLowerCase().includes(q) ||
      b.seats?.seat_number?.toLowerCase().includes(q)
    const sedeMatch = sedeFilter ? b.sede === sedeFilter : true
    return nameMatch && sedeMatch
  })

  // Counts
  const total = bookings.length
  const bySede = SEDI.map(s => ({ sede: s, count: bookings.filter(b => b.sede === s).length }))

  const bookingBySeat = new Map(bookings.map(b => [b.seat_id, b]))
  const filteredIds = new Set(filtered.map(b => b.id))
  const isFiltering = search !== '' || sedeFilter !== ''

  // Ordinamento come in sala: file A→S, posti per numero
  const seatById = new Map(seats.map(s => [s.id, s]))
  function compareBySeat(a: Booking, b: Booking) {
    const sa = seatById.get(a.seat_id)
    const sb = seatById.get(b.seat_id)
    const ra = ALL_ROWS.indexOf(sa?.row_letter ?? a.seats?.row_letter)
    const rb = ALL_ROWS.indexOf(sb?.row_letter ?? b.seats?.row_letter)
    if (ra !== rb) return ra - rb
    return (sa?.seat_index ?? 0) - (sb?.seat_index ?? 0)
  }

  function seatsOfRow(row: string) {
    return seats.filter(s => s.row_letter === row).sort((a, b) => b.seat_index - a.seat_index)
  }

  async function downloadSummaryPDF() {
    setPdfLoading(true)
    try {
      // Dynamic import — avoids SSR errors on Next.js
      const jsPDF = (await import('jspdf')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      function fit(text: string, maxW: number) {
        if (doc.getTextWidth(text) <= maxW) return text
        let t = text
        while (t.length > 1 && doc.getTextWidth(t + '.') > maxW) t = t.slice(0, -1)
        return t + '.'
      }

      // ── Pagina 1: mappa con i nomi ──────────────────────────
      {
        const pageW = 297
        const pageH = 210
        const margin = 10

        doc.setFillColor(251, 191, 36)
        doc.rect(0, 0, pageW, 3, 'F')

        doc.setFont('times', 'bold')
        doc.setFontSize(16)
        doc.setTextColor(24, 24, 27)
        doc.text('Mappa Posti Prenotati', pageW / 2, 11, { align: 'center' })
        doc.setFont('times', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(113, 113, 122)
        doc.text(
          `${total} posti prenotati su ${seats.length}`,
          pageW / 2, 16, { align: 'center' }
        )

        // Palco
        doc.setFillColor(228, 228, 231)
        doc.roundedRect(margin + 40, 19, pageW - 2 * margin - 80, 5, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(82, 82, 91)
        doc.text('PALCO', pageW / 2, 22.4, { align: 'center' })

        const top = 27
        const corridor = 5
        const labelW = 6
        const maxSeats = Math.max(1, ...ALL_ROWS.map(r => seatsOfRow(r).length))
        const rh = Math.min(10, (pageH - margin - top - corridor) / ALL_ROWS.length)
        const cw = Math.min(20, (pageW - 2 * margin - labelW) / maxSeats)
        const x0 = (pageW - (labelW + maxSeats * cw)) / 2

        let y = top
        ALL_ROWS.forEach((row, i) => {
          if (i === FRONT_ROWS.length) {
            doc.setDrawColor(161, 161, 170)
            doc.setLineWidth(0.2)
            doc.setLineDashPattern([1, 1], 0)
            doc.line(x0, y + corridor / 2, x0 + labelW + maxSeats * cw, y + corridor / 2)
            doc.setLineDashPattern([], 0)
            y += corridor
          }

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(180, 83, 9)
          doc.text(row, x0 + labelW / 2, y + rh / 2 + 1, { align: 'center' })

          seatsOfRow(row).forEach((seat, j) => {
            const cx = x0 + labelW + j * cw
            const w = cw - 0.8
            const h = rh - 0.8
            const b = bookingBySeat.get(seat.id)

            if (b) {
              doc.setFillColor(254, 243, 199)
              doc.setDrawColor(217, 119, 6)
            } else {
              doc.setFillColor(250, 250, 250)
              doc.setDrawColor(212, 212, 216)
            }
            doc.setLineWidth(0.2)
            doc.roundedRect(cx, y, w, h, 0.8, 0.8, 'FD')

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(4.5)
            doc.setTextColor(113, 113, 122)
            doc.text(seat.seat_number, cx + 0.8, y + 1.9)

            if (b) {
              doc.setFont('helvetica', 'bold')
              doc.setFontSize(5.5)
              doc.setTextColor(24, 24, 27)
              doc.text(fit(b.last_name, w - 1.2), cx + w / 2, y + h * 0.58, { align: 'center' })
              doc.setFont('helvetica', 'normal')
              doc.text(fit(b.first_name, w - 1.2), cx + w / 2, y + h * 0.58 + 2.2, { align: 'center' })
            }
          })
          y += rh
        })
      }

      // ── Pagine successive: riepilogo ────────────────────────
      const pageW = 210
      const pageH = 297
      const margin = 15
      let y = 0

      function newPage() {
        doc.addPage('a4', 'portrait')
        doc.setFillColor(251, 191, 36)
        doc.rect(0, 0, pageW, 3, 'F')
        y = margin + 5
      }

      function heading(text: string) {
        if (y > pageH - 40) newPage()
        doc.setFont('times', 'bold')
        doc.setFontSize(15)
        doc.setTextColor(24, 24, 27)
        doc.text(text, margin, y)
        doc.setDrawColor(251, 191, 36)
        doc.setLineWidth(0.5)
        doc.line(margin, y + 2, pageW - margin, y + 2)
        y += 9
      }

      function table(cols: { label: string; w: number }[], rows: string[][]) {
        const lineH = 4.2
        const drawHeader = () => {
          doc.setFillColor(39, 39, 42)
          doc.rect(margin, y - 4.5, pageW - 2 * margin, 6.5, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(255, 255, 255)
          let x = margin + 2
          for (const c of cols) { doc.text(c.label.toUpperCase(), x, y); x += c.w }
          y += 6
        }
        drawHeader()
        doc.setFontSize(9)
        rows.forEach((r, i) => {
          doc.setFont('helvetica', 'normal')
          const cells = r.map((v, k) => doc.splitTextToSize(v, cols[k].w - 3) as string[])
          const h = Math.max(...cells.map(c => c.length)) * lineH + 2
          if (y + h > pageH - margin) { newPage(); drawHeader(); doc.setFontSize(9) }
          if (i % 2 === 0) {
            doc.setFillColor(244, 244, 245)
            doc.rect(margin, y - 4, pageW - 2 * margin, h, 'F')
          }
          let x = margin + 2
          cells.forEach((lines, k) => {
            doc.setFont('helvetica', k === 0 ? 'bold' : 'normal')
            doc.setTextColor(24, 24, 27)
            doc.text(lines, x, y)
            x += cols[k].w
          })
          y += h
        })
        y += 6
      }

      newPage()
      doc.setFont('times', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(24, 24, 27)
      doc.text('Riepilogo Prenotazioni', pageW / 2, y, { align: 'center' })
      y += 10

      heading('Totali')
      table(
        [{ label: 'Sede', w: 120 }, { label: 'Posti', w: 60 }],
        [
          ...bySede.map(({ sede, count }) => [sede, String(count)]),
          ['Totale prenotati', `${total} su ${seats.length}`],
        ]
      )

      // Raggruppa per persona (stesso nome, cognome e sede)
      const groups = new Map<string, { last: string; first: string; sede: string; items: Booking[] }>()
      for (const b of [...bookings].sort(compareBySeat)) {
        const key = [b.last_name, b.first_name, b.sede].map(v => v.trim().toLowerCase()).join('|')
        const g = groups.get(key) ?? { last: b.last_name, first: b.first_name, sede: b.sede, items: [] }
        g.items.push(b)
        groups.set(key, g)
      }
      const people = [...groups.values()].sort((a, b) =>
        a.last.localeCompare(b.last, 'it') || a.first.localeCompare(b.first, 'it')
      )

      heading('Per persona')
      table(
        [{ label: 'Cognome', w: 40 }, { label: 'Nome', w: 35 }, { label: 'Sede', w: 30 }, { label: 'N.', w: 10 }, { label: 'Posti', w: 65 }],
        people.map(p => [p.last, p.first, p.sede, String(p.items.length), p.items.map(b => b.seats?.seat_number).join(', ')])
      )

      heading('Per posto')
      table(
        [{ label: 'Posto', w: 20 }, { label: 'Cognome', w: 55 }, { label: 'Nome', w: 55 }, { label: 'Sede', w: 50 }],
        [...bookings].sort(compareBySeat).map(b => [b.seats?.seat_number ?? '', b.last_name, b.first_name, b.sede])
      )

      // Footer su tutte le pagine
      const now = new Date()
      const stamp = `Generato il ${now.toLocaleDateString('it-IT')} alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
      const pages = doc.getNumberOfPages()
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        const w = doc.internal.pageSize.getWidth()
        const h = doc.internal.pageSize.getHeight()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(161, 161, 170)
        doc.text(stamp, 10, h - 4)
        doc.text(`Pagina ${p} di ${pages}`, w - 10, h - 4, { align: 'right' })
      }

      doc.save(`riepilogo_prenotazioni_${now.toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error('PDF error', e)
      alert('Errore nella generazione del PDF. Riprova.')
    }
    setPdfLoading(false)
  }

  function renderMapBlock(rows: string[]) {
    return rows.map(row => (
      <div key={row} className="flex items-center gap-1 mb-1">
        <span className="sticky left-0 z-10 bg-zinc-950 w-6 text-center text-xs font-bold text-amber-400 font-mono shrink-0">{row}</span>
        <div className="flex gap-1">
          {seatsOfRow(row).map(seat => {
            const b = bookingBySeat.get(seat.id)
            const dimmed = isFiltering && (!b || !filteredIds.has(b.id))
            return (
              <button
                key={seat.id}
                type="button"
                onClick={() => setMapSeatId(mapSeatId === seat.id ? null : seat.id)}
                title={b ? `${seat.seat_number} — ${b.first_name} ${b.last_name} (${b.sede})` : `${seat.seat_number} — libero`}
                className={`w-14 h-10 sm:w-[4.5rem] sm:h-11 rounded px-1 py-0.5 flex flex-col text-left leading-tight overflow-hidden transition-opacity ${
                  b ? 'bg-rose-900/70 border border-rose-600/60' : 'bg-zinc-800/60 border border-zinc-700/60'
                } ${dimmed ? 'opacity-25' : ''} ${mapSeatId === seat.id ? 'ring-2 ring-amber-400' : ''}`}
              >
                <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400">{seat.seat_number}</span>
                {b && (
                  <>
                    <span className="w-full text-[9px] sm:text-[10px] font-bold text-white truncate">{b.last_name}</span>
                    <span className="w-full text-[9px] sm:text-[10px] text-zinc-300 truncate">{b.first_name}</span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    ))
  }

  function renderEditFields(b: Booking, size: string) {
    if (!editing) return null
    const cls = `bg-zinc-800 border border-zinc-600 text-white rounded-lg w-full focus:outline-none focus:border-amber-400 ${size}`
    return {
      first: <input className={cls} placeholder="Nome" value={editing.first_name} onChange={e => setEditing({ ...editing, first_name: e.target.value })} />,
      last: <input className={cls} placeholder="Cognome" value={editing.last_name} onChange={e => setEditing({ ...editing, last_name: e.target.value })} />,
      sede: (
        <select className={cls} value={editing.sede} onChange={e => setEditing({ ...editing, sede: e.target.value })}>
          {SEDI.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
      actions: (
        <div className="flex gap-2 justify-end">
          <button
            onClick={saveEdit}
            disabled={savingId === b.id}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 sm:py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {savingId === b.id ? '…' : 'Salva'}
          </button>
          <button
            onClick={() => setEditing(null)}
            className="flex-1 sm:flex-none bg-zinc-600 hover:bg-zinc-500 text-white px-3 py-2 sm:py-1 rounded-lg text-xs font-bold transition-colors"
          >
            Annulla
          </button>
        </div>
      ),
    }
  }

  function renderRowActions(b: Booking) {
    return confirmDelete === b.id ? (
      <div className="flex gap-2 justify-end items-center">
        <span className="text-zinc-400 text-xs">Sicuro?</span>
        <button
          onClick={() => deleteBooking(b.id)}
          disabled={deletingId === b.id}
          className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 sm:py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
        >
          {deletingId === b.id ? '…' : 'Sì, elimina'}
        </button>
        <button
          onClick={() => setConfirmDelete(null)}
          className="bg-zinc-600 hover:bg-zinc-500 text-white px-3 py-2 sm:py-1 rounded-lg text-xs font-bold transition-colors"
        >
          No
        </button>
      </div>
    ) : (
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setEditing({ id: b.id, first_name: b.first_name, last_name: b.last_name, sede: b.sede })}
          className="bg-zinc-600 hover:bg-zinc-500 text-white px-3 py-2 sm:py-1 rounded-lg text-xs font-bold transition-colors"
        >
          Modifica
        </button>
        <button
          onClick={() => setConfirmDelete(b.id)}
          className="bg-rose-800 hover:bg-rose-600 text-white px-3 py-2 sm:py-1 rounded-lg text-xs font-bold transition-colors"
        >
          Elimina
        </button>
      </div>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const mapSeat = mapSeatId !== null ? seatById.get(mapSeatId) : undefined
  const mapBooking = mapSeatId !== null ? bookingBySeat.get(mapSeatId) : undefined

  // ── LOGIN ────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-5xl">🔐</span>
            <h1 className="text-2xl font-bold text-amber-400 mt-4" style={{ fontFamily: 'Georgia, serif' }}>
              Area Admin
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Inserisci la password per accedere</p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Password"
              className={`w-full bg-zinc-800 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${pwdError ? 'border-rose-500 focus:border-rose-400' : 'border-zinc-600 focus:border-amber-400'}`}
              value={pwd}
              onChange={e => { setPwd(e.target.value); setPwdError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {pwdError && <p className="text-rose-400 text-sm -mt-2">Password errata.</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-amber-400 text-zinc-900 font-bold py-3 rounded-xl hover:bg-amber-300 transition-colors"
            >
              Accedi
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── DASHBOARD ────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>
              🎭 Dashboard Admin
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Gestione prenotazioni teatro</p>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="text-zinc-500 hover:text-white text-sm transition-colors py-2 shrink-0"
          >
            Esci →
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="bg-zinc-800 rounded-xl p-3 sm:p-4 col-span-3 lg:col-span-1 flex lg:block items-baseline justify-between">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Totale</p>
            <p className="text-3xl font-bold text-amber-400">{total}</p>
          </div>
          {bySede.map(({ sede, count }) => (
            <div key={sede} className="bg-zinc-800 rounded-xl p-3 sm:p-4 min-w-0">
              <p className="text-zinc-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1 truncate">{sede}</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{count}</p>
            </div>
          ))}
        </div>

        {/* Filtri */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            className="flex-1 bg-zinc-800 border border-zinc-600 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400 transition-colors"
            placeholder="Cerca per nome, cognome o posto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="bg-zinc-800 border border-zinc-600 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400 transition-colors"
            value={sedeFilter}
            onChange={e => setSedeFilter(e.target.value)}
          >
            <option value="">Tutte le sedi</option>
            {SEDI.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex gap-3">
            <button
              onClick={loadBookings}
              className="flex-1 sm:flex-none bg-zinc-700 hover:bg-zinc-600 px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              ↻ Aggiorna
            </button>
            <button
              onClick={downloadSummaryPDF}
              disabled={pdfLoading || loading}
              className="flex-1 sm:flex-none bg-amber-400 text-zinc-900 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-300 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? 'Generazione PDF…' : '⬇ Scarica PDF'}
            </button>
          </div>
        </div>

        {/* Vista */}
        <div className="flex gap-1 mb-4 bg-zinc-800 rounded-xl p-1 w-full sm:w-fit">
          {(['table', 'map'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-lg text-sm font-bold transition-colors ${view === v ? 'bg-amber-400 text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
            >
              {v === 'table' ? 'Tabella' : 'Mappa'}
            </button>
          ))}
        </div>

        {/* Tabella */}
        {loading ? (
          <div className="text-center py-20 text-zinc-500">Caricamento…</div>
        ) : view === 'map' ? (
          <>
            <p className="sm:hidden text-zinc-500 text-xs text-center mb-2">← Scorri lateralmente · tocca un posto per i dettagli →</p>
            <div className="rounded-xl border border-zinc-800 py-4 pr-4 overflow-x-auto">
              <div className="min-w-max mx-auto w-fit">
                <div className="bg-zinc-800/80 text-zinc-300 text-center py-2 rounded-lg mb-6 ml-7 font-bold tracking-[0.3em] uppercase text-xs">
                  Palco
                </div>
                {renderMapBlock(FRONT_ROWS)}
                <div className="border-t border-dashed border-zinc-700 my-4 ml-7" />
                {renderMapBlock(BACK_ROWS)}
              </div>
            </div>

            {mapSeat && (
              <div className="fixed sm:static bottom-0 left-0 right-0 z-20 sm:mt-4 bg-zinc-900 border-t sm:border border-zinc-700 sm:rounded-xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 flex items-center gap-3">
                <span className="bg-amber-400 text-zinc-900 font-bold px-2 py-0.5 rounded font-mono text-sm shrink-0">
                  {mapSeat.seat_number}
                </span>
                <div className="flex-1 min-w-0">
                  {mapBooking ? (
                    <>
                      <p className="text-white font-semibold truncate">{mapBooking.last_name} {mapBooking.first_name}</p>
                      <p className="text-zinc-400 text-xs">{mapBooking.sede} · {formatDate(mapBooking.created_at)}</p>
                    </>
                  ) : (
                    <p className="text-zinc-400">Posto libero</p>
                  )}
                </div>
                <button onClick={() => setMapSeatId(null)} className="text-zinc-400 hover:text-white text-xl px-2 shrink-0" aria-label="Chiudi">
                  ×
                </button>
              </div>
            )}
          </>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Nessuna prenotazione trovata.</div>
        ) : (
          <>
            {/* Telefono: schede */}
            <div className="md:hidden flex flex-col gap-2">
              {filtered.map(b => {
                const edit = editing?.id === b.id ? renderEditFields(b, 'px-3 py-2 text-base') : null
                return (
                  <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <span className="bg-amber-400 text-zinc-900 font-bold px-2 py-0.5 rounded font-mono text-xs shrink-0 mt-0.5">
                        {b.seats?.seat_number}
                      </span>
                      {edit ? (
                        <div className="flex-1 flex flex-col gap-2">
                          {edit.first}
                          {edit.last}
                          {edit.sede}
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{b.last_name} {b.first_name}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            <span className="text-zinc-300">{b.sede}</span> · {formatDate(b.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">{edit ? edit.actions : renderRowActions(b)}</div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: tabella */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800/80 text-zinc-400 uppercase text-xs tracking-wider">
                    <th className="text-left px-4 py-3">Posto</th>
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Cognome</th>
                    <th className="text-left px-4 py-3">Sede</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-right px-4 py-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => {
                    const edit = editing?.id === b.id ? renderEditFields(b, 'px-2 py-1') : null
                    return (
                      <tr
                        key={b.id}
                        className={`border-t border-zinc-800 transition-colors ${i % 2 === 0 ? 'bg-zinc-900/40' : 'bg-zinc-950/40'} hover:bg-zinc-800/30`}
                      >
                        <td className="px-4 py-3">
                          <span className="bg-amber-400 text-zinc-900 font-bold px-2 py-0.5 rounded font-mono text-xs">
                            {b.seats?.seat_number}
                          </span>
                        </td>
                        {edit ? (
                          <>
                            <td className="px-4 py-3">{edit.first}</td>
                            <td className="px-4 py-3">{edit.last}</td>
                            <td className="px-4 py-3">{edit.sede}</td>
                            <td className="px-4 py-3 text-zinc-500">
                              {new Date(b.created_at).toLocaleDateString('it-IT')}
                            </td>
                            <td className="px-4 py-3 text-right">{edit.actions}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-zinc-200">{b.first_name}</td>
                            <td className="px-4 py-3 text-zinc-200">{b.last_name}</td>
                            <td className="px-4 py-3">
                              <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded text-xs">{b.sede}</span>
                            </td>
                            <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(b.created_at)}</td>
                            <td className="px-4 py-3 text-right">{renderRowActions(b)}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className={`text-zinc-600 text-xs mt-4 text-right ${view === 'map' && mapSeat ? 'mb-20 sm:mb-0' : ''}`}>{filtered.length} prenotazion{filtered.length !== 1 ? 'i' : 'e'} visualizzat{filtered.length !== 1 ? 'e' : 'a'}</p>
      </div>
    </main>
  )
}
