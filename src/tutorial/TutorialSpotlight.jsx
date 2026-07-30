export function TutorialSpotlight({ rect }) {
  if (!rect) return null
  return (
    <div
      className="absolute rounded-[20px] border-2 border-[#F7DDE6] bg-transparent shadow-[0_0_0_9999px_rgba(22,11,18,0.66),0_18px_50px_rgba(0,0,0,0.25)] transition-[height,left,top,width] duration-150"
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
