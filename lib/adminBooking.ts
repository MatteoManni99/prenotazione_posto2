import { useSyncExternalStore } from 'react'

// Permette all'admin di prenotare prima dell'apertura.
// Il flag vive in sessionStorage: vale solo per la scheda del browser in cui l'admin ha fatto login.
const KEY = 'prenotazione_admin_anticipata'

export function setAdminBooking(enabled: boolean) {
  try {
    if (enabled) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {}
}

function read() {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export function useAdminBooking() {
  return useSyncExternalStore(() => () => {}, read, () => false)
}
