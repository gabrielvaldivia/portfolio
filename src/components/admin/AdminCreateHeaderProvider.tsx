'use client'

import { getTranslation } from '@payloadcms/translations'
import { useConfig, useStepNav, useTranslation, type StepNavItem } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useEffect, type ReactNode } from 'react'

function getCreateCollectionSlug(pathname: string, adminRoute: string) {
  const normalizedAdminRoute = adminRoute === '/' ? '' : adminRoute.replace(/\/+$/, '')
  const adminPath = pathname.startsWith(normalizedAdminRoute)
    ? pathname.slice(normalizedAdminRoute.length)
    : pathname
  const match = adminPath.match(/^\/collections\/([^/]+)\/create(?:\/|$)/)

  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function AdminCreateHeaderProvider({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const { i18n } = useTranslation()
  const { setStepNav, stepNav } = useStepNav()
  const {
    config: {
      routes: { admin: adminRoute },
    },
    getEntityConfig,
  } = useConfig()

  useEffect(() => {
    const collectionSlug = getCreateCollectionSlug(pathname, adminRoute)

    if (!collectionSlug) {
      return
    }

    const collectionConfig = getEntityConfig({ collectionSlug })

    if (!collectionConfig || !('labels' in collectionConfig)) {
      return
    }

    const singularLabel = getTranslation(collectionConfig.labels.singular, i18n)
    const title = `New ${typeof singularLabel === 'string' ? singularLabel : collectionSlug}`
    const listURL =
      stepNav[0]?.url ||
      formatAdminURL({
        adminRoute,
        path: `/collections/${collectionSlug}`,
      })
    const nextNav: StepNavItem[] = [
      {
        label: stepNav[0]?.label || collectionConfig.labels.plural,
        url: listURL,
      },
      {
        label: title,
      },
    ]
    const currentLastLabel = stepNav[stepNav.length - 1]?.label
    const currentLastText = typeof currentLastLabel === 'string' ? currentLastLabel : ''

    if (stepNav.length === nextNav.length && stepNav[0]?.url === listURL && currentLastText === title) {
      return
    }

    setStepNav(nextNav)
  }, [adminRoute, getEntityConfig, i18n, pathname, setStepNav, stepNav])

  return <>{children}</>
}
