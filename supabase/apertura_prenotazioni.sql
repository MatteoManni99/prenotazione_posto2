-- Blocco lato database: impedisce l'inserimento di prenotazioni prima dell'apertura,
-- anche da chi aggira il countdown nel browser.
-- Da eseguire nello SQL Editor di Supabase. La data deve coincidere con
-- APERTURA_PRENOTAZIONI in lib/saggio.ts.
-- La policy è RESTRICTIVE: si somma (in AND) alle policy di insert già esistenti.

drop policy if exists "apertura_prenotazioni" on public.bookings;

create policy "apertura_prenotazioni"
  on public.bookings
  as restrictive
  for insert
  to anon, authenticated
  with check (now() >= timestamptz '2026-11-20 20:00:00+01');
