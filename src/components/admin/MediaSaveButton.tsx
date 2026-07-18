'use client'

import {
  FormSubmit,
  toast,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormModified,
  useHotkey,
  useOperation,
  useRouteTransition,
  useTranslation,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import type { SaveButtonClientProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { useRef, useState } from 'react'

const pendingSuccessToastKey = 'payload-pending-success-toast'

export function MediaSaveButton({ label: labelProp }: SaveButtonClientProps) {
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()
  const { collectionSlug, uploadStatus } = useDocumentInfo()
  const { submit } = useForm()
  const modified = useFormModified()
  const editDepth = useEditDepth()
  const operation = useOperation()
  const router = useRouter()
  const { startRouteTransition } = useRouteTransition()
  const { t } = useTranslation()
  const [redirecting, setRedirecting] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  const disabled = redirecting || (operation === 'update' && !modified) || uploadStatus === 'uploading'
  const label = labelProp || t('general:save')

  const redirectToCollectionList = () => {
    const message =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(pendingSuccessToastKey) : null

    if (message) {
      window.sessionStorage.removeItem(pendingSuccessToastKey)
      toast.success(message)
    }

    const redirectRoute = formatAdminURL({
      adminRoute,
      path: `/collections/${collectionSlug || 'media'}`,
    })

    startRouteTransition(() => router.replace(redirectRoute))
  }

  const handleSubmit = async () => {
    if (disabled) {
      return
    }

    const shouldRedirectToList = operation === 'create'

    if (shouldRedirectToList) {
      setRedirecting(true)
    }

    const result = await submit()

    if (shouldRedirectToList && result?.res?.ok) {
      redirectToCollectionList()
      return
    }

    if (shouldRedirectToList) {
      setRedirecting(false)
    }
  }

  useHotkey(
    {
      cmdCtrlKey: true,
      editDepth,
      keyCodes: ['s'],
    },
    (event) => {
      event.preventDefault()
      event.stopPropagation()

      if (!disabled) {
        ref.current?.click()
      }
    },
  )

  return (
    <FormSubmit
      buttonId="action-save"
      disabled={disabled}
      onClick={() => {
        void handleSubmit()
      }}
      ref={ref}
      size="medium"
      type="button"
    >
      {label}
    </FormSubmit>
  )
}
