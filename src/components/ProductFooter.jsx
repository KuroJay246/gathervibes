export function ProductFooter({ compact = false }) {
  const currentYear = new Date().getFullYear()
  const yearText = currentYear <= 2026 ? '2026' : `2026-${currentYear}`

  return (
    <footer className={`${compact ? 'mt-8' : 'mt-10'} border-t border-[#EEDDD3] px-2 pb-1 pt-5 text-center text-[11px] leading-5 text-[#80685B]`}>
      <p>© {yearText} Gather &amp; Savor Event Hub. All rights reserved.</p>
      <p>Created and developed by Jaylan Maynard — built to plan, organize and deliver memorable events.</p>
    </footer>
  )
}
