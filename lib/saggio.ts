// ─────────────────────────────────────────────────────────────
// Configurazione del saggio: per un nuovo evento basta aggiornare questo file.
// ─────────────────────────────────────────────────────────────

export const SAGGIO = {
  /** Nome dell'evento, mostrato nei PDF */
  titolo: 'Spettacolo di Natale',
  /** Luogo dell'evento */
  luogo: 'Teatro del Colle Don Bosco',
  /** Data come deve apparire sul sito e nei PDF */
  data: '20 Dicembre 2026',
  /** Orario di inizio */
  orario: '18:00',
}

/** Sedi di danza selezionabili nel modulo di prenotazione */
export const SEDI = ['Pavarolo', 'Marentino', 'Villanova', 'Andezeno', 'Castelnuovo']

/** Password per accedere all'area admin (/admin) */
export const ADMIN_PASSWORD = 'Ares?'

/** File della sala (devono corrispondere a `row_letter` nella tabella seats) */
export const FRONT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
export const BACK_ROWS  = ['I', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']
