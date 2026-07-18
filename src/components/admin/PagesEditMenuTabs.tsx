'use client'

import { PopupList, useConfig, useDocumentInfo, useTranslation } from '@payloadcms/ui'
import { usePathname, useSearchParams } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'

function withLocale(href: string, locale: string | null) {
  return locale ? `${href}?locale=${encodeURIComponent(locale)}` : href
}

export function PagesEditMenuTabs() {
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()
  const { collectionSlug, id } = useDocumentInfo()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  if (collectionSlug !== 'pages' || !id || id === 'create') {
    return null
  }

  const docPath = formatAdminURL({
    adminRoute,
    path: `/collections/${collectionSlug}/${id}`,
  })
  const editHref = docPath
  const apiHref = `${docPath}/api`
  const locale = searchParams.get('locale')
  const editIsActive = pathname === editHref
  const apiIsActive = pathname.startsWith(apiHref)

  return (
    <>
      <PopupList.Divider />
      <PopupList.GroupLabel label="View" />
      <PopupList.Button
        active={editIsActive}
        disabled={editIsActive}
        href={withLocale(editHref, locale)}
        id="pages-edit-menu-edit"
      >
        {t('general:edit')}
      </PopupList.Button>
      <PopupList.Button
        active={apiIsActive}
        disabled={apiIsActive}
        href={withLocale(apiHref, locale)}
        id="pages-edit-menu-api"
      >
        API
      </PopupList.Button>
    </>
  )
}
