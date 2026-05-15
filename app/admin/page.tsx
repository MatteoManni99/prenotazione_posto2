'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

const ADMIN_PASSWORD = '@9L5SzigeCbSECgDHW33es3555532pldpanQSlpspsm12=3441??33'

const SEDI = ['Pavarolo', 'Marentino', 'Sciolze', 'Andezeno', 'Castelnuovo']

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
    const { data } = await supabase
      .from('bookings')
      .select('*, seats(seat_number, row_letter, block)')
      .order('seats(row_letter)', { ascending: true })
    setBookings((data as Booking[]) || [])
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
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400" style={{ fontFamily: 'Georgia, serif' }}>
              🎭 Dashboard Admin
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Gestione prenotazioni teatro</p>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Esci →
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <div className="bg-zinc-800 rounded-xl p-4 col-span-2 sm:col-span-1 lg:col-span-1">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Totale</p>
            <p className="text-3xl font-bold text-amber-400">{total}</p>
          </div>
          {bySede.map(({ sede, count }) => (
            <div key={sede} className="bg-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1 truncate">{sede}</p>
              <p className="text-2xl font-bold text-white">{count}</p>
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
          <button
            onClick={loadBookings}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            ↻ Aggiorna
          </button>
        </div>

        {/* Tabella */}
        {loading ? (
          <div className="text-center py-20 text-zinc-500">Caricamento…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Nessuna prenotazione trovata.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
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
                {filtered.map((b, i) => (
                  <tr
                    key={b.id}
                    className={`border-t border-zinc-800 transition-colors ${i % 2 === 0 ? 'bg-zinc-900/40' : 'bg-zinc-950/40'} hover:bg-zinc-800/30`}
                  >
                    {editing?.id === b.id ? (
                      <>
                        {/* Posto non modificabile */}
                        <td className="px-4 py-3">
                          <span className="bg-amber-400 text-zinc-900 font-bold px-2 py-0.5 rounded font-mono text-xs">
                            {b.seats?.seat_number}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="bg-zinc-800 border border-zinc-600 text-white rounded-lg px-2 py-1 w-full focus:outline-none focus:border-amber-400"
                            value={editing.first_name}
                            onChange={e => setEditing({ ...editing, first_name: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="bg-zinc-800 border border-zinc-600 text-white rounded-lg px-2 py-1 w-full focus:outline-none focus:border-amber-400"
                            value={editing.last_name}
                            onChange={e => setEditing({ ...editing, last_name: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="bg-zinc-800 border border-zinc-600 text-white rounded-lg px-2 py-1 w-full focus:outline-none focus:border-amber-400"
                            value={editing.sede}
                            onChange={e => setEditing({ ...editing, sede: e.target.value })}
                          >
                            {SEDI.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {new Date(b.created_at).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={saveEdit}
                              disabled={savingId === b.id}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {savingId === b.id ? '…' : 'Salva'}
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="bg-zinc-600 hover:bg-zinc-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              Annulla
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <span className="bg-amber-400 text-zinc-900 font-bold px-2 py-0.5 rounded font-mono text-xs">
                            {b.seats?.seat_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-200">{b.first_name}</td>
                        <td className="px-4 py-3 text-zinc-200">{b.last_name}</td>
                        <td className="px-4 py-3">
                          <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded text-xs">{b.sede}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">
                          {new Date(b.created_at).toLocaleDateString('it-IT', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {confirmDelete === b.id ? (
                            <div className="flex gap-2 justify-end items-center">
                              <span className="text-zinc-400 text-xs">Sicuro?</span>
                              <button
                                onClick={() => deleteBooking(b.id)}
                                disabled={deletingId === b.id}
                                className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                {deletingId === b.id ? '…' : 'Sì, elimina'}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="bg-zinc-600 hover:bg-zinc-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditing({ id: b.id, first_name: b.first_name, last_name: b.last_name, sede: b.sede })}
                                className="bg-zinc-600 hover:bg-zinc-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                              >
                                Modifica
                              </button>
                              <button
                                onClick={() => setConfirmDelete(b.id)}
                                className="bg-rose-800 hover:bg-rose-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                              >
                                Elimina
                              </button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-zinc-600 text-xs mt-4 text-right">{filtered.length} prenotazione{filtered.length !== 1 ? 'i' : 'e'} visualizzata{filtered.length !== 1 ? 'e' : ''}</p>
      </div>
    </main>
  )
}
