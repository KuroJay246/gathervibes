function optionText(option) {
  return String(option?.label || option?.id || '').trim()
}

function byLabel(left, right) {
  return optionText(left).localeCompare(optionText(right))
}

export function RelationshipSelector({
  label,
  value = '',
  values = [],
  options = [],
  onChange,
  multiple = false,
  placeholder = 'Select a linked record',
  emptyText = 'No records available yet.',
}) {
  const sortedOptions = [...options].filter((option) => option?.id).sort(byLabel)
  const selectedValues = multiple ? values : [value].filter(Boolean)
  const optionsById = new Map(sortedOptions.map((entry) => [entry.id, entry]))
  const selectedIds = new Set(selectedValues)
  const selected = []
  for (const id of selectedValues) {
    if (id) selected.push(optionsById.get(id) || { id, label: id })
  }
  const remaining = sortedOptions.filter((option) => !selectedIds.has(option.id))

  function addSelection(nextValue) {
    if (!nextValue) return
    if (multiple) {
      onChange([...selectedValues, nextValue])
      return
    }
    onChange(nextValue)
  }

  function removeSelection(removeId) {
    if (multiple) {
      onChange(selectedValues.filter((id) => id !== removeId))
      return
    }
    onChange('')
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-[#2B1723]">
      <label>
        {label}
        <select
          value=""
          onChange={(event) => addSelection(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-[#E7D6CC] px-3 text-sm font-normal text-[#2B1723]"
        >
          <option value="">{remaining.length ? placeholder : emptyText}</option>
          {remaining.map((option) => (
            <option key={option.id} value={option.id}>{optionText(option)}</option>
          ))}
        </select>
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <span key={option.id} className="inline-flex items-center gap-2 rounded-full bg-[#F5E6C8] px-3 py-1 text-xs font-bold text-[#5A443B]">
              {optionText(option)}
              <button
                type="button"
                onClick={() => removeSelection(option.id)}
                className="rounded-full text-[#8A3F4B] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#8A3F4B]"
                aria-label={`Remove ${optionText(option)}`}
              >
                Remove
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
