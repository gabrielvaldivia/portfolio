'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Image03Icon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import type { ComponentProps } from 'react'

type AdminHugeIconProps = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'> & {
  icon: IconSvgElement
}

export function AdminHugeIcon({
  className,
  color = 'currentColor',
  size = 18,
  strokeWidth = 1.5,
  ...props
}: AdminHugeIconProps) {
  return (
    <HugeiconsIcon
      aria-hidden={props['aria-label'] ? undefined : true}
      className={['custom-hugeicon', className].filter(Boolean).join(' ')}
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  )
}

export function AdminBrandIcon() {
  return <AdminHugeIcon className="custom-admin-brand-icon" icon={Image03Icon} />
}

export function AdminBrandLogo() {
  return (
    <span className="custom-admin-brand-logo">
      <AdminHugeIcon className="custom-admin-brand-logo__icon" icon={Image03Icon} />
      <span className="custom-admin-brand-logo__text">CMS</span>
    </span>
  )
}
