export function Container({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`max-w-[1400px] mx-auto px-5 tablet:px-10 ${className}`}>
      {children}
    </div>
  )
}
