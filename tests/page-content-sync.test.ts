import assert from 'node:assert/strict'
import test from 'node:test'
import { currentBiography, getSyncedPageContent } from '../scripts/lib/pageContentSync'
import { lexicalToMarkdown, lexicalToPlainText } from '../src/lib/agentMarkdown'
import { ABOUT_BIO_HEADING, getAboutPortraits } from '../src/lib/aboutBio'

test('sync matches the live content, preserves references, and is repeatable', () => {
  const hero = { id: 'hero', blockType: 'hero', heading: 'Existing hero', slides: [{ project: 22, image: 606, pills: ['AI'] }] }
  const chat = { id: 'chat', blockType: 'accordion', items: [{ question: 'Keep this', answer: currentBiography() }], links: [{ platform: 'Email', url: 'mailto:test@example.com' }] }
  const talks = { id: 'talks', blockType: 'aboutTalksSection', talks: [{ title: 'Keep this talk', thumbnail: 447 }] }
  const home = { sections: [hero, { id: 'intro', blockType: 'aboutSection' }, { blockType: 'numberedGrid', items: [{ id: 'one', title: "I'll be your thought partner.", text: currentBiography() }] }, { blockType: 'marqueeSection', clients: [10] }, { blockType: 'hScroll', source: 'featuredTestimonials', testimonials: [7] }, chat, { blockType: 'socialLinks', links: chat.links }] }
  const about = { aboutSections: [{ id: 'bio', blockType: 'aboutBioSection' }, talks] }
  const before = structuredClone({ home, about })
  const result = getSyncedPageContent(home, about, { light: 800, dark: 801 })
  assert.deepEqual({ home, about }, before)
  assert.deepEqual(result.home.sections[0], hero)
  assert.deepEqual(result.about.aboutSections[1], talks)
  assert.equal(result.home.sections[1].heading, ABOUT_BIO_HEADING)
  assert.equal(result.home.sections[2].items[0].title, 'A thought partner')
  assert.equal(result.home.sections[3].title, 'Work')
  assert.equal(result.home.sections[3].linkUrl, '/work')
  assert.deepEqual(result.home.sections[4].items, chat.items)
  assert.deepEqual(result.home.sections[5].links, chat.links)
  assert.equal(result.about.aboutSections[2].blockType, 'aboutPlaygroundSection')
  assert.deepEqual(getSyncedPageContent(result.home, result.about, { light: 800, dark: 801 }), result)
})

test('the two bios share copy while the About version preserves the timeline link', () => {
  assert.equal(lexicalToPlainText(currentBiography()), lexicalToPlainText(currentBiography(true)))
  assert.match(lexicalToMarkdown(currentBiography(true)), /\[two decades\]\(\/timeline\)/)
  assert.doesNotMatch(lexicalToMarkdown(currentBiography()), /\]\(\/timeline\)/)
})

test('shared portraits use CMS images and fall back to the light image when dark is cleared', () => {
  const light = { url: 'https://example.com/light.jpg', alt: 'Updated light portrait' }
  const dark = { url: 'https://example.com/dark.jpg' }
  assert.deepEqual(getAboutPortraits({ image: light, imageDark: dark }), { image: light, darkImage: dark })
  assert.deepEqual(getAboutPortraits({ image: light, imageDark: null }), { image: light, darkImage: light })
})
