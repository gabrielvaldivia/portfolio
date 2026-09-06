import { createServerFeature } from '@payloadcms/richtext-lexical'

export const NoteLinkedImagesFeature = createServerFeature({
  feature: {
    ClientFeature:
      './components/admin/noteLinkedImages/feature.client#NoteLinkedImagesFeatureClient',
  },
  key: 'noteLinkedImages',
})
