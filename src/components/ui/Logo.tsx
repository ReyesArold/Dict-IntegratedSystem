import { cn } from '../../utils/cn'

interface LogoProps {
  className?: string
  title?: string
}

export function Logo({ className, title }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('h-10 w-10', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <rect width="48" height="48" rx="12" fill="#0F304B" />
      <rect x="1" y="1" width="46" height="46" rx="11" fill="none" stroke="#1B4161" />
      <path
        d="M12.5 34.5 24 9.5l11.5 25"
        fill="none"
        stroke="#F7FBFE"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.6 26.2h12.8"
        fill="none"
        stroke="#F9CB47"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="24" cy="9.5" r="3.2" fill="#91DCFF" stroke="#0F304B" strokeWidth="1.4" />
      <circle cx="12.5" cy="34.5" r="3" fill="#FFFFFF" stroke="#0F304B" strokeWidth="1.4" />
      <circle cx="35.5" cy="34.5" r="3" fill="#FFFFFF" stroke="#0F304B" strokeWidth="1.4" />
      <circle cx="24" cy="26.2" r="2.5" fill="#F9CB47" stroke="#0F304B" strokeWidth="1.2" />
    </svg>
  )
}
