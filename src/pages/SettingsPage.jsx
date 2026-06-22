import { CheckCircle2, Database, ExternalLink, KeyRound, LogOut, ServerCog } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { isFirebaseConfigured } from '../lib/firebase'
import { SystemHealthPanel } from '../components/SystemHealthPanel'

const collections = ['events', 'registrations', 'tickets', 'communications', 'aiDrafts', 'auditLogs', 'settings']

export function SettingsPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Workspace connection</p>
            <h2 className="mt-2 font-serif text-2xl">Firebase</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF6EF] px-3 py-1.5 text-[10px] font-bold text-[#2F855A]">
            <CheckCircle2 className="size-3.5" />
            {isFirebaseConfigured ? 'Configured' : 'Setup needed'}
          </span>
        </div>

        <div className="mt-7 space-y-3">
          <div className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FCEEF1] text-[#B76E79]">
              <KeyRound className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Google + email authentication</p>
              <p className="mt-0.5 text-xs text-[#8A7468]">Google is primary; email/password remains available as backup</p>
            </div>
            <CheckCircle2 className="size-5 shrink-0 text-[#2F855A]" />
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFF4DF] text-[#9A712B]">
              <Database className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Cloud Firestore</p>
              <p className="mt-0.5 text-xs text-[#8A7468]">Deployed approved-admin rules with no public access</p>
            </div>
            <CheckCircle2 className="size-5 shrink-0 text-[#2F855A]" />
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3EEFF] text-[#7558A7]">
              <ServerCog className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Firebase Hosting</p>
              <p className="mt-0.5 text-xs text-[#8A7468]">SPA rewrites and mobile PWA foundation configured</p>
            </div>
            <CheckCircle2 className="size-5 shrink-0 text-[#2F855A]" />
          </div>
        </div>

        <a
          href="https://console.firebase.google.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#A85F6B] hover:text-[#7D3F4A]"
        >
          Open Firebase console
          <ExternalLink className="size-3.5" />
        </a>
      </section>

      <section className="min-w-0 rounded-[24px] border border-[#E6D4B4] bg-[#F8E9CB] p-6 sm:p-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#86662C]">Data model reserved</p>
        <h2 className="mt-2 font-serif text-2xl text-[#4E3928]">Firestore collections</h2>
        <p className="mt-3 text-xs leading-5 text-[#715D46]">
          Collections are listed in security rules but remain empty until their implementation phase.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {collections.map((collection) => (
            <code key={collection} className="rounded-lg border border-[#DCC799] bg-white/55 px-2.5 py-1.5 text-[11px] text-[#654D34]">
              {collection}
            </code>
          ))}
        </div>
      </section>

      <SystemHealthPanel />

      <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Session</p>
        <h2 className="mt-2 font-serif text-2xl">Admin access</h2>
        <p className="mt-3 break-words text-sm text-[#816D62]">
          Signed in as <strong>{user?.email || 'admin'}</strong>.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2B1723] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3A2630] sm:w-auto"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </section>
    </div>
  )
}
