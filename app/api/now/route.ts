// Ora del server: il countdown non dipende dall'orologio del dispositivo dell'utente.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } })
}
