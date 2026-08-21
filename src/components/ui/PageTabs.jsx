import { useRef } from 'react'

export function PageTabs({ tabs, active, onChange, label = 'Page sections', idPrefix = '', controlsPanels = true }) {
  const tabRefs = useRef([])

  function panelId(tabId) {
    return idPrefix ? `${idPrefix}-${tabId}-panel` : `${tabId}-panel`
  }

  function tabId(tabIdValue) {
    return idPrefix ? `${idPrefix}-${tabIdValue}-tab` : undefined
  }

  function selectTab(tab, index, shouldFocus = false) {
    onChange(tab.id)
    if (shouldFocus) {
      window.requestAnimationFrame(() => tabRefs.current[index]?.focus())
    }
  }

  function moveFocus(event, direction) {
    const currentIndex = tabs.findIndex((tab) => tab.id === active)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = direction === 'previous'
      ? (safeIndex - 1 + tabs.length) % tabs.length
      : (safeIndex + 1) % tabs.length
    selectTab(tabs[nextIndex], nextIndex, true)
    event.preventDefault()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') moveFocus(event, 'previous')
    if (event.key === 'ArrowRight') moveFocus(event, 'next')
    if (event.key === 'Home') {
      selectTab(tabs[0], 0, true)
      event.preventDefault()
    }
    if (event.key === 'End') {
      selectTab(tabs[tabs.length - 1], tabs.length - 1, true)
      event.preventDefault()
    }
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto rounded-2xl border border-[#EEDFD6] bg-white p-2">
      {tabs.map((tab, index) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            ref={(element) => { tabRefs.current[index] = element }}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={controlsPanels ? panelId(tab.id) : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(tab, index)}
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
