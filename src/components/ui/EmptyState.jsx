import { CalendarPlus } from 'lucide-react'

export function EmptyState({
  icon: Icon = CalendarPlus,
  title = 'Your event calendar is ready',
  description = 'Create Cake Picnic Barbados or another gathering to begin organizing the details.',
  action,
  onCreate,
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#DCC8BD] bg-white px-6 py-16 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#FCEEF1] text-[#B76E79]">
        <Icon className="size-7" strokeWidth={1.6} />
      </span>
      <h3 className="mt-5 font-serif text-2xl text-[#2B1723]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#806C61]">
        {description}
      </p>
      {action}
      {!action && onCreate && (
        <button type="button" onClick={onCreate} className="mt-6 rounded-xl bg-[#B76E79] px-5 py-3 text-xs font-bold text-white">
          Create your first event
        </button>
      )}
    </div>
  )
}
