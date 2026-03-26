export function Container({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`max-w-[1400px] mx-auto px-5 tablet:px-10 ${className}`}>
      {children}
    </div>
  )
}

export function NarrowContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`max-w-[800px] ${className}`}>
      {children}
    </div>
  )
}
