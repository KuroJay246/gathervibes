import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { db, firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { buildRuntimeHealthItems, healthTone } from '../utils/runtimeHealth'
import { isProtectedOwnerUser } from '../config/protectedOwner'

const toneClasses = {
  green: 'bg-[#E5F3EC] text-[#1E7345]',
  gold: 'bg-[#FFF4DF] text-[#7A5818]',
  red: 'bg-[#FFF1F1] text-[#A32626]',
}

function StatusIcon({ status }) {
  if (status === 'ok') return <CheckCircle2 className="size-4" aria-hidden="true" />
  if (status === 'warn') return <AlertTriangle className="size-4" aria-hidden="true" />
  return <XCircle className="size-4" aria-hidden="true" />
}

export function SystemHealthPanel({ compact = false }) {
  const { user, currentRoleLabel } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [allowlistApproved, setAllowlistApproved] = useState(null)
  const [eventsStatus, setEventsStatus] = useState('warn')
  const [registrationsStatus, setRegistrationsStatus] = useState('warn')
  const [auditStatus, setAuditStatus] = useState('warn')

  useEffect(() => {
    let active = true

    async function checkHealth() {
      if (!db || !user?.email) {
        setAllowlistApproved(false)
        setEventsStatus('fail')
        setRegistrationsStatus(activeEvent?.eventId ? 'fail' : 'warn')
        setAuditStatus('warn')
        return
      }

      if (isProtectedOwnerUser(user)) {
        if (active) setAllowlistApproved(true)
      } else try {
        const accessDoc = await getDoc(doc(db, 'settings', 'accessControl'))
        const emails = Array.isArray(accessDoc.data()?.approvedEmails) ? accessDoc.data().approvedEmails : []
        const approvedEmails = emails.map((email) => String(email || '').trim().toLowerCase())
        if (active) setAllowlistApproved(approvedEmails.includes(String(user.email || '').trim().toLowerCase()))
      } catch {
        if (active) setAllowlistApproved(false)
      }

      try {
        await getDocs(query(collection(db, 'events'), limit(1)))
        if (active) setEventsStatus('ok')
      } catch {
        if (active) setEventsStatus('fail')
      }

      if (activeEvent?.eventId) {
        try {
          await getDocs(query(collection(db, 'registrations'), where('eventId', '==', activeEvent.eventId), limit(1)))
          if (active) setRegistrationsStatus('ok')
        } catch {
          if (active) setRegistrationsStatus('fail')
        }
      } else if (active) {
        setRegistrationsStatus('warn')
      }

      try {
        await getDocs(query(collection(db, 'auditLogs'), limit(1)))
        if (active) setAuditStatus('ok')
      } catch {
        if (active) setAuditStatus('fail')
      }
    }

    void checkHealth()
    return () => {
      active = false
    }
  }, [activeEvent?.eventId, user])

  const items = useMemo(
    () => buildRuntimeHealthItems({
      firebaseConfigured: isFirebaseConfigured,
      projectId: firebaseProjectId,
      user,
      currentRoleLabel,
      allowlistApproved,
      eventsStatus,
      registrationsStatus,
      auditStatus,
      serviceWorkerSafe: true,
      activeEvent,
      buildCommit: import.meta.env.VITE_BUILD_COMMIT,
    }),
    [activeEvent, allowlistApproved, auditStatus, currentRoleLabel, eventsStatus, registrationsStatus, user],
  )

  return (
    <section className={`rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)] ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Runtime status</p>
          <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">System Health</h2>
        </div>
        <span className="rounded-full bg-[#F7F1ED] px-3 py-1.5 text-[10px] font-bold text-[#6B564C]">
          Read-only checks
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#80685B]">
        Shows app service status without exposing secrets, service account details, or the full admin allowlist.
      </p>

      <div className={`mt-5 grid gap-3 ${compact ? '' : 'md:grid-cols-2'}`}>
        {items.map((item) => {
          const tone = healthTone(item.status)
          return (
            <article key={item.label} className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#EFE2DA] p-4">
              <span className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
                <StatusIcon status={item.status} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#2B1723]">{item.label}</span>
                <span className="mt-0.5 block break-words text-xs leading-5 text-[#80685B]">{item.detail}</span>
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

