export function TutorialArrow({ placement }) {
  const classes = 'absolute size-4 rotate-45 border border-[#E7D6CC] bg-white'
  if (placement === 'right') return <span className={`${classes} -left-2 top-8`} aria-hidden="true" />
  if (placement === 'left') return <span className={`${classes} -right-2 top-8`} aria-hidden="true" />
  if (placement === 'top') return <span className={`${classes} -bottom-2 left-8`} aria-hidden="true" />
  if (placement === 'bottom') return <span className={`${classes} -top-2 left-8`} aria-hidden="true" />
  return null
}
