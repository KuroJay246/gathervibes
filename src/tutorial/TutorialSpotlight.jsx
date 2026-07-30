export function TutorialSpotlight({ rect }) {
  if (!rect) return null
  return (
    <div
      className="absolute rounded-[20px] border-[3px] border-[#FFD6A8] bg-transparent shadow-[0_0_0_9999px_rgba(22,11,18,0.38),0_0_0_6px_rgba(255,214,168,0.22),0_18px_50px_rgba(0,0,0,0.18)] ring-2 ring-[#8A3F4B] ring-offset-2 ring-offset-white/80 transition-[height,left,top,width] duration-150"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden="true"
    />
  )
}
