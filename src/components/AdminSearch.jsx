import { useEffect, useMemo, useState } from 'react'
import { Search, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToEvents } from '../services/eventService'
import { subscribeToRegistrations } from '../services/registrationService'
import { buildAdminSearchResults } from '../utils/adminSearch'

const badgeTone = {
  Event: 'bg-[#F3EEFF] text-[#6B3FA0]',
  Registration: 'bg-[#E5F3EC] text-[#1E7345]',
  Ticket: 'bg-[#FFF4DF] text-[#986F26]',
  'Check-In': 'bg-[#FCEEF1] text-[#A32626]',
}

export function AdminSearch() {
  const { activeEvent } = useActiveEvent()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    return subscribeToEvents(
      (data) => {
        setEvents(data)
        setLoading(false)
        setError('')
      },
      () => {
        setError('Search could not read events.')
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    if (!activeEvent?.eventId) {
      return undefined
    }

    return subscribeToRegistrations(
      activeEvent.eventId,
      (data) => {
        setRegistrations(data)
        setError('')
      },
      () => setError('Search could not read registrations for the Working Event.'),
    )
  }, [activeEvent?.eventId])

  const results = useMemo(
    () => buildAdminSearchResults({ query, events, registrations, activeEvent }),
    [activeEvent, events, query, registrations],
  )

  const showPanel = focused && query.trim().length > 0

  function openResult(result) {
    setQuery('')
    setFocused(false)
    navigate(result.to)
  }

  return (
    <div className="relative hidden min-w-[260px] max-w-[420px] flex-1 md:block">
      <label htmlFor="admin-search" className="sr-only">Search admin workspace</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" aria-hidden="true" />
      <input
        id="admin-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 140)}
        placeholder={activeEvent?.eventId ? 'Search events, guests, tickets…' : 'Search events…'}
        className="min-h-11 w-full rounded-xl border border-[#E7D6CC] bg-white py-2.5 pl-10 pr-9 text-sm text-[#2B1723] shadow-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/15"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#B8A49A] hover:bg-[#FFF8F2] hover:text-[#2B1723]"
          aria-label="Clear search"
        >
          <XCircle className="size-4" />
        </button>
      )}

      {showPanel && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E7D6CC] bg-white shadow-[0_18px_60px_rgba(43,23,35,0.16)]">
          <div className="border-b border-[#F2E8E1] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B76E79]">Workspace search</p>
            {!activeEvent?.eventId && (
              <p className="mt-1 text-xs text-[#8C7567]">Select a Working Event to search registrations, tickets, and check-in records.</p>
            )}
          </div>

          {loading ? (
            <p className="px-4 py-5 text-sm text-[#8C7567]">Searching…</p>
          ) : error ? (
            <p className="px-4 py-5 text-sm text-[#A32626]">{error}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[#8C7567]">No results found.</p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto py-2">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openResult(result)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#FFF8F2]"
                  >
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${badgeTone[result.type]}`}>
                      {result.type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#2B1723]">{result.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#8C7567]">{result.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
