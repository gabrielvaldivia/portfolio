'use client'

import { Link, useConfig, useListQuery, useStepNav } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useEffect, type ReactNode } from 'react'

type PhotoDoc = {
  id: number | string
  filename?: string
  sizes?: Record<string, { url?: string }>
  thumbnailURL?: string
  url?: string
}

type PhotosListViewProps = {
  BeforeList?: ReactNode
  BeforeListTable?: ReactNode
}

function getThumbnailURL(photo: PhotoDoc) {
  return photo.thumbnailURL || photo.sizes?.web?.url || photo.url
}

export function PhotosListView({ BeforeList, BeforeListTable }: PhotosListViewProps) {
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()
  const { data } = useListQuery()
  const { setStepNav } = useStepNav()
  const photos = ((data?.docs || []) as PhotoDoc[]).filter(Boolean)

  useEffect(() => {
    setStepNav([{ label: 'Photos' }])
  }, [setStepNav])

  return (
    <div className="collection-list collection-list--photos collection-list--photos-ios">
      {BeforeList}
      <main className="photos-ios-list-view">
        {BeforeListTable}

        {photos.length > 0 ? (
          <div className="photos-ios-grid" aria-label="Photos">
            {photos.map((photo) => {
              const thumbnailURL = getThumbnailURL(photo)
              const href = formatAdminURL({
                adminRoute,
                path: `/collections/photos/${photo.id}`,
              })

              return (
                <Link
                  aria-label={photo.filename ? `Open ${photo.filename}` : 'Open photo'}
                  className="photos-ios-tile"
                  href={href}
                  key={photo.id}
                  prefetch={false}
                >
                  <span className="photos-ios-tile__media" aria-hidden="true">
                    {thumbnailURL ? <img alt="" src={thumbnailURL} /> : null}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="photos-ios-empty">
            <p>No photos yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
