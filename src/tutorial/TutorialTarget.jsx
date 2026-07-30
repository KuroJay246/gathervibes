export function TutorialTarget({ id, children, className = '', as: Component = 'div', ...props }) {
  return (
    <Component data-tour-id={id} className={className} {...props}>
      {children}
    </Component>
  )
}
