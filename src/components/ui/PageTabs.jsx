export function PageTabs({ tabs, active, onChange, label = 'Page sections' }) {
  function moveFocus(event, direction) {
    const currentIndex = tabs.findIndex((tab) => tab.id === active)
    const nextIndex = direction === 'previous'
      ? (currentIndex - 1 + tabs.length) % tabs.length
      : (currentIndex + 1) % tabs.length
    onChange(tabs[nextIndex].id)
    event.preventDefault()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') moveFocus(event, 'previous')
    if (event.key === 'ArrowRight') moveFocus(event, 'next')
    if (event.key === 'Home') {
      onChange(tabs[0].id)
      event.preventDefault()
    }
    if (event.key === 'End') {
      onChange(tabs[tabs.length - 1].id)
      event.preventDefault()
    }
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto rounded-2xl border border-[#EEDFD6] bg-white p-2">
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${tab.id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={`min-h-10 shrink-0 rounded-xl px-4 text-left text-xs font-bold transition ${
              selected ? 'bg-[#2B1723] text-white' : 'text-[#6B564C] hover:bg-[#FFF8F2]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${selected ? 'bg-white/15 text-white' : 'bg-[#F7F1ED] text-[#80685B]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
