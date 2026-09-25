import { ABOUT_BIO_HEADING, ABOUT_BIO_PARAGRAPHS } from '../../src/lib/aboutBio'

type Document = Record<string, any>

const textNode = (text: string) => ({
  type: 'text', text, format: 0, mode: 'normal', style: '', detail: 0, version: 1,
})

export function currentBiography(linkTimeline = false) {
  return {
    root: {
      type: 'root', format: '', indent: 0, direction: 'ltr', version: 1,
      children: ABOUT_BIO_PARAGRAPHS.map((text, index) => {
        const [before, after] = text.split('two decades')
        const children = linkTimeline && index === 0 ? [
          textNode(before),
          {
            type: 'link', version: 3, format: '', indent: 0, direction: 'ltr',
            fields: { linkType: 'custom', url: '/timeline', newTab: false },
            children: [textNode('two decades')],
          },
          textNode(after),
        ] : [textNode(text)]
        return { type: 'paragraph', format: '', indent: 0, direction: 'ltr', version: 1, children }
      }),
    },
  }
}

/** One-time reconciliation with the September 24 live pages, preserving unrelated content. */
export function getSyncedPageContent(home: Document, about: Document, portraits: { light: number | string; dark: number | string }) {
  if (!home.sections?.some((section: Document) => section.blockType === 'aboutSection')) {
    throw new Error('Expected the existing Home About block')
  }
  if (!about.aboutSections?.some((section: Document) => section.blockType === 'aboutBioSection')) {
    throw new Error('Expected the existing About Bio block')
  }

  const sections = home.sections
    .filter((section: Document) => !(section.blockType === 'hScroll' && section.source === 'featuredTestimonials'))
    .map((section: Document) => {
      switch (section.blockType) {
        case 'aboutSection':
          return { ...section, heading: ABOUT_BIO_HEADING, text: currentBiography(), image: portraits.light, imageDark: portraits.dark }
        case 'numberedGrid':
          return {
            ...section,
            items: section.items.map((item: Document) => ({
              ...item,
              title: (/^I['’]ll be your thought partner[.!]?$/i.test(item.title)
                ? 'A thought partner' : item.title).replace(/\.+$/, ''),
            })),
          }
        case 'marqueeSection':
          return { ...section, title: 'Work', blockName: 'Work', linkUrl: '/work', linkText: 'See all' }
        case 'socialLinks':
          return { ...section, title: "Building something new? Let's talk." }
        case 'accordion':
          return { ...section, blockName: 'Chat Knowledge (used on /chat)' }
        default:
          return section
      }
    })
  const aboutSections = about.aboutSections.map((section: Document) => section.blockType === 'aboutBioSection'
    ? { ...section, title: ABOUT_BIO_HEADING, bio: currentBiography(true) }
    : section)
  if (!aboutSections.some((section: Document) => section.blockType === 'aboutPlaygroundSection')) {
    aboutSections.push({
      id: 'about-playground', blockType: 'aboutPlaygroundSection', blockName: 'Playground',
      title: 'Playground', itemLimit: 5, linkText: 'View all',
    })
  }
  return { home: { sections }, about: { aboutSections } }
}
