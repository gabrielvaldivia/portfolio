'use client'

import { Calendar04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LOCATION_CONTEXT } from '../data/timelineWorldContext'
import { HoverArrow } from './Icons'
import { Calendar } from './ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/Popover'
import styles from './TimelineExperience.module.css'

const BIRTH_YEAR = 1987
const PRESENT_YEAR = 2026
const BIRTH_TIMESTAMP = Date.UTC(1987, 2, 23)
const PRESENT_TIMESTAMP = Date.UTC(2026, 7, 19)
const TICKS_PER_YEAR = 1
const CHAPTER_PULL_THRESHOLD = 80
const MOBILE_CHAPTER_PULL_THRESHOLD = 140
const CHAPTER_PULL_MAX_OFFSET = 52
const CHAPTER_PULL_DAMPING = 140
const CHAPTER_CUE_PULL_MAX_OFFSET = 12
const CHAPTER_CUE_PULL_DAMPING = 56
const CHAPTER_MOTION_EASE = 'cubic-bezier(0.22, 0.61, 0.24, 1)'
const CHAPTER_WHEEL_QUIET_MS = 80
const CHAPTER_BACKWARD_WHEEL_QUIET_MS = 220
const CHAPTER_EXIT_DURATION = 200
const CHAPTER_ENTER_DURATION = 420
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const PILL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

type TimelinePeriod = {
  startYear: number
  endYear: number
  label: string
}

type DatedTimelinePeriod = {
  start: number
  end: number
  label: string
}

const monthStart = (year: number, month: number) => Date.UTC(year, month - 1, 1)

const LOCATION_HISTORY: TimelinePeriod[] = [
  { startYear: 1987, endYear: 1994, label: 'Cuba' },
  { startYear: 1995, endYear: 2002, label: 'Costa Rica' },
  { startYear: 2003, endYear: 2011, label: 'Tampa' },
  { startYear: 2012, endYear: 2012, label: 'Los Angeles' },
  { startYear: 2013, endYear: 2014, label: 'San Francisco' },
  { startYear: 2015, endYear: 2015, label: 'London, England' },
  { startYear: 2016, endYear: 2017, label: 'San Francisco' },
  { startYear: 2018, endYear: PRESENT_YEAR, label: 'New York City' },
]

const EDUCATION_HISTORY: TimelinePeriod[] = [
  { startYear: 1988, endYear: 1991, label: 'Los Muñequitos' },
  { startYear: 1992, endYear: 1993, label: 'Los Muñequitos' },
  { startYear: 1994, endYear: 1994, label: 'Julio Antonio Mella' },
  { startYear: 1995, endYear: 1995, label: 'Julio Antonio Mella' },
  { startYear: 1996, endYear: 1996, label: 'Ciudad Quesada' },
  { startYear: 1997, endYear: 1997, label: 'Chaves' },
  { startYear: 1998, endYear: 1999, label: 'Santa Catalina' },
  { startYear: 2000, endYear: 2000, label: 'Los Angeles' },
  { startYear: 2001, endYear: 2003, label: 'Don Bosco' },
  { startYear: 2004, endYear: 2005, label: 'Leto High School' },
  { startYear: 2006, endYear: 2007, label: 'HCC' },
  { startYear: 2008, endYear: 2010, label: 'Art Institute' },
]

const WORK_HISTORY: DatedTimelinePeriod[] = [
  { start: monthStart(2005, 7), end: monthStart(2006, 1), label: 'La Teresita' },
  { start: monthStart(2006, 1), end: monthStart(2006, 7), label: 'American Supply' },
  { start: monthStart(2006, 9), end: monthStart(2007, 1), label: 'Credit Advisor' },
  { start: monthStart(2007, 8), end: monthStart(2008, 2), label: 'OTH' },
  { start: monthStart(2008, 3), end: monthStart(2008, 7), label: 'Collections' },
  { start: monthStart(2008, 7), end: monthStart(2008, 11), label: 'Lithobinder' },
  { start: monthStart(2008, 11), end: monthStart(2009, 3), label: 'Auto Trader' },
  { start: monthStart(2009, 3), end: monthStart(2010, 4), label: 'Imagemedia' },
  { start: monthStart(2010, 4), end: monthStart(2010, 10), label: 'Cefco' },
  { start: monthStart(2010, 10), end: monthStart(2011, 6), label: 'Momentum Mobile' },
  { start: monthStart(2011, 6), end: monthStart(2012, 3), label: 'Mad Mobile' },
  { start: monthStart(2012, 3), end: monthStart(2012, 11), label: 'Mopro' },
  { start: monthStart(2012, 11), end: monthStart(2014, 1), label: 'Automatic' },
  { start: monthStart(2014, 1), end: monthStart(2017, 11), label: 'Facebook' },
  { start: monthStart(2017, 11), end: monthStart(2019, 7), label: 'Google' },
  { start: monthStart(2019, 7), end: monthStart(2020, 4), label: 'Canopy' },
  { start: monthStart(2020, 4), end: monthStart(2021, 3), label: 'CNN' },
  { start: monthStart(2021, 3), end: monthStart(2023, 9), label: 'Patreon' },
  { start: monthStart(2023, 9), end: PRESENT_TIMESTAMP + 1, label: 'Valdivia Works' },
]

const CHAPTER_STARTS = [
  monthStart(2001, 1), // Don Bosco, Leto, HCC, and Art Institute
  monthStart(2010, 10), // Momentum Mobile + Mad Mobile
  monthStart(2012, 3), // Mopro
  monthStart(2012, 11), // Automatic
  monthStart(2014, 1), // Facebook
  monthStart(2017, 11), // Google
  monthStart(2019, 7), // Canopy
  monthStart(2020, 4), // CNN
  monthStart(2021, 3), // Patreon
  monthStart(2023, 9), // Valdivia Works
]

const getPeriodLabel = (periods: TimelinePeriod[], year: number) => periods.find(
  ({ startYear, endYear }) => year >= startYear && year <= endYear,
)?.label ?? '—'

const getDatedPeriodLabel = (periods: DatedTimelinePeriod[], timestamp: number) => periods.find(
  ({ start, end }) => timestamp >= start && timestamp < end,
)?.label ?? '—'

const getChapterIndex = (timestamp: number) => {
  for (let index = CHAPTER_STARTS.length - 1; index >= 0; index -= 1) {
    if (timestamp >= CHAPTER_STARTS[index]) {
      return index + 1
    }
  }

  return 0
}

const CHAPTER_BOUNDARIES = [BIRTH_TIMESTAMP, ...CHAPTER_STARTS]

const getChapterRangeLabel = (chapterIndex: number) => {
  const startDate = new Date(CHAPTER_BOUNDARIES[chapterIndex])
  const isCurrentChapter = chapterIndex === CHAPTER_BOUNDARIES.length - 1

  if (isCurrentChapter) {
    return `${MONTH_YEAR_FORMATTER.format(startDate)} – Present`
  }

  const endDate = new Date(CHAPTER_BOUNDARIES[chapterIndex + 1] - 1)
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear()

  return sameYear
    ? `${MONTH_FORMATTER.format(startDate)} – ${MONTH_YEAR_FORMATTER.format(endDate)}`
    : `${MONTH_YEAR_FORMATTER.format(startDate)} – ${MONTH_YEAR_FORMATTER.format(endDate)}`
}
const CHAPTER_CONTENT = [
  {
    title: 'Early Influences',
    paragraphs: [
      `I was born on March 23, 1987, in Fomento, a small town in central Cuba's Sancti Spíritus province. My father, Ismael Valdivia, became a doctor after growing up as the son of two farmers in Sancti Spíritus. My mother, Rosa María Vilvey, was an accountant who had been raised by her aunt and came from a family of Spanish descent. My brother, Alejandro Valdivia, arrived two and a half years before me and would eventually become a designer as well. Before I understood anything about careers or creative identity, these were the people and the place that formed the world around me.`,
      `Creativity was part of the atmosphere in my family long before I knew it could become a career. My father is a self-published poet and has always been reading, while his brothers were theater directors. My brother was always playing music. Their example made creative and intellectual curiosity feel like a natural part of everyday life. I found my own version of that inheritance through drawing, comic books, and an early fascination with computers.`,
      `Drawing was the first creative ability that felt distinctly mine. It was something I could practice, improve, and use to express ideas I did not yet have words for. At the same time, moving from Fomento, Cuba, to Costa Rica taught me that identity could be remade without being erased. I watched my family leave behind familiarity, careers, and stability so my brother and I could have more possibilities. Their sacrifice made adaptation feel normal and reinvention feel possible.`,
      `That combination of creative exposure and constant change gave me a need to make things of my own. I knew I could draw, and I knew I wanted a life that kept me close to the feeling of creating, but I did not yet know what form that life could take. The answer began to appear when I encountered graphic design: a practical discipline that could connect art, communication, and technology. By the time I had to choose a vocational path in school, design felt less like a new direction than a name for something I had already been moving toward.`,
    ],
  },
  {
    title: 'Design Education',
    paragraphs: [
      `The creative instincts of my childhood became a deliberate path in 2001, when I chose graphic design at Colegio Técnico Don Bosco. Don Bosco was a vocational school: half of each day was devoted to traditional academic subjects and the other half to a chosen discipline. Architecture and mechanical engineering were among the alternatives, but design felt like the clearest extension of the drawing I had always loved. For the first time, creativity became structured study rather than simply an instinct, and I began to imagine that making things could become the center of a professional life.`,
      `I moved to Tampa before completing my education at Colegio Técnico Don Bosco, but kept those design skills alive by making posters, websites, and visual identities for the band I played in with my brother. At Hillsborough Community College, I returned to design through a much wider arts education. Figure drawing, sculpture, photography, music theory, music history, and art history placed graphic design inside a larger creative tradition. I already knew what I wanted to do; HCC helped me understand what could give that practice depth. The Art Institute then brought a narrower focus and a much higher standard of craft. I went deeper into typography, branding, layout, and web design, learning to see every formal choice as part of a coherent system. Students working in digital media also showed me that design was already moving beyond static pages and printed artifacts.`,
      `During my final portfolio review at the end of my time at the Art Institute, my professor Bill Corridori challenged me to stop comparing myself with the other students in the room and start comparing my work with designers outside the school. Until then, my frame of reference had largely been the work immediately around me. His challenge forced me to measure myself against the wider design world, and it had a profound effect on how I saw both myself and my work moving forward. It raised the standard I wanted to reach while expanding my sense of where I could belong professionally. When I completed my BFA in 2010, I left with stronger craft, higher expectations, and a desire to enter the most open part of the profession I could find. The iPhone had just created a medium with few established rules, and a pair of boutique mobile agencies gave me the chance to start learning it immediately.`,
    ],
  },
  {
    title: 'Introduction to Mobile',
    paragraphs: [
      `After graduating, I joined Momentum Mobile and then Mad Mobile, two boutique agencies focused on the new world forming around the iPhone. The established agencies I had learned about in school seemed to have rigid ladders, accepted methods, and long histories that were difficult to enter. Mobile felt like a rebellious alternative. The medium was so new that nobody had much seniority, the conventions were still being invented, and a good idea could matter more than pedigree. It gave me a way into product design without first asking permission from the traditional design establishment.`,
      `Much of the early work involved translating complicated websites into experiences that could make sense in a person's hand. Desktop assumptions broke quickly on a small touch screen, so we learned to reduce each experience to its essential actions, make hierarchy unmistakable, and build navigation around a thumb rather than a cursor. We discovered interaction patterns in real time and then turned the successful ones into reusable systems that could support the next client. In the process, I learned that product design was not simply graphic design on a screen; behavior, sequence, feedback, and constraint were all part of the material.`,
      `The most addictive part was the immediacy. I could design an interaction, put it on a phone, and feel the idea working in my hand. That closed the distance between imagining something and experiencing it, and I have been chasing that feeling ever since. After a few years, however, I wanted to do more than solve one mobile translation at a time. I wanted to help shape the product, the team, and the system around the work. That ambition eventually took me from Tampa to Los Angeles, where Mopro and Mohawk Digital offered my first opportunity to lead.`,
    ],
  },
  {
    title: 'Getting a Taste of Startups',
    paragraphs: [
      `The mobile-agency years made me want more ownership, and eventually that desire carried me to Los Angeles. I joined a company that operated under two names and two complementary models. Mohawk Digital was the agency side, working with clients such as QVC, Diesel, and The Economist. Mopro was the in-house product: an all-in-one website, commerce, and online-presence platform built specifically for small businesses. The agency work helped fund the product, so I moved constantly between serving a particular client's needs and building a reusable system that could serve thousands of very different businesses.`,
      `That structure taught me to shift between bespoke expression and scalable product thinking. A client project demanded speed, empathy for an existing brand, and a clear response to a fixed brief. Mopro required us to anticipate many future needs, define modules, and make decisions that would remain coherent as the product expanded. It was my first close look at startup product development and my first experience translating an ambitious founder's abstract direction into concrete design decisions. I learned how to absorb strong opinions, find the useful intent inside them, and move the work forward without turning every disagreement into a conflict.`,
      `It was also my first experience managing designers. I was young and suddenly responsible for hiring, motivating, and directing people who were often at the same stage of their careers as I was. Most of what I learned came through trial and error: how to make expectations clear, how to critique the work without diminishing the person, and how to create enough trust for people to take creative risks. Los Angeles gave me my first taste of leadership and startup culture, but it also made San Francisco feel like the place where I could test myself more fully. When the founders of Automatic offered less certainty in exchange for genuine design ownership, I was ready to make that trade.`,
    ],
  },
  {
    title: 'Taking Ownership',
    paragraphs: [
      `Leaving Los Angeles for San Francisco was a bet on ownership. When I met Automatic's founders, they were honest that they could not offer the salary of a larger company. What they could offer was an open door: my name would be attached to the design decisions, and I would have the freedom to shape the company as I believed it should be shaped. I was not particularly interested in cars, but I was deeply interested in bringing everything I had learned into one coherent product and being accountable for the result.`,
      `As Automatic's founding designer, I worked across product strategy, the mobile apps, the website, packaging, identity, and even the sounds the device made. The product was a smart driving assistant, but the experience extended far beyond the hardware that plugged into a car. Every touchpoint had to make unfamiliar technology feel understandable, trustworthy, and useful. Our tiny team made design inseparable from the company itself. I learned to make decisions with incomplete information, tell a product story before every detail existed, and carry that story all the way into something people could buy and use. Seeing the finished product in Apple Stores made that ownership tangible.`,
      `Automatic gave my pent-up creative energy a place to go. By the end, I felt that I had applied nearly everything I knew, and that feeling was both satisfying and unsettling. The experience proved I could shape an entire product, but it also revealed a much higher ceiling of craft, storytelling, and organizational influence that I could not reach alone. I wanted to work beside designers operating at the highest level and learn how decisions changed when the audience became global. Facebook offered the opposite of Automatic's blank canvas: enormous scale, deep expertise, and the chance to become a student again.`,
    ],
  },
  {
    title: 'Learning at Scale',
    paragraphs: [
      `Automatic taught me how much one designer could shape; Facebook taught me how much more there was to learn. I arrived confident in my ability to make products, but quickly became an apprentice inside a far more ambitious environment. The designers around me were operating at the highest level of the field, and the consequences of every decision were amplified by the number and diversity of people who would encounter it. My sense of possible impact expanded from national to global almost overnight.`,
      `I learned to prototype ideas before the organization had language for them, build narratives that made those ideas legible, and navigate the politics that come with large, complex systems. Pages, Friend Sharing, and Photos each required a different understanding of people, incentives, and scale. I came to enjoy the feeling of entering a team without assuming that the methods from the previous one would transfer. The beginner's mind was not a lack of experience; it was a way of keeping experience from becoming a constraint.`,
      `VR made that lesson literal. By then I understood how to operate inside Facebook, but spatial design forced me to begin again with tools such as Origami and Unity. I helped bring panoramic photos into 360, worked on the Facebook 360 app for Gear VR and social experiences in Facebook Spaces, and helped the multidisciplinary design team grow from two to twelve people in two years. Our VR Resources project began as an attempt to publish definitive guidelines, but the medium was too young for certainty. We shared our experiments and tools instead, helping other designers move from 2D interfaces into spatial work while establishing Facebook as a leader in the field.`,
      `That work gave me confidence as a prototyper, storyteller, and design leader. It also made me increasingly aware of where those skills were being aimed. Consumer VR was exciting, but much of it felt like expensive entertainment for people who could already afford access to the future. In a politically turbulent moment, I wanted to apply the same abilities to problems with more immediate consequences. Google appeared to offer a bridge: first through a promising VR creation tool, and then through Jigsaw's work on safety, disinformation, and social good.`,
    ],
  },
  {
    title: 'Design for Social Good',
    paragraphs: [
      `My growing discomfort with consumer VR led me to Google's Daydream team, where I expected to work on Blocks, a tool for creating three-dimensional objects from inside VR. Designing 3D objects in a 3D environment felt like one of the medium's clearest native uses. On my first day, however, a reorganization deprioritized the product and forced me to find a new place inside Google almost immediately. What initially felt destabilizing became a useful test: without the project I had joined for, I had to decide what kind of impact I actually wanted.`,
      `I found that answer at Jigsaw. One of the team's projects used VR and AI to create de-escalation training scenarios for law enforcement. It felt almost poetic to redirect skills developed in an expensive, exclusive medium toward the people most vulnerable to police violence. The work was not about making VR more entertaining; it was about helping someone practice a consequential decision before facing it in the world. That project became my entry point into a broader portfolio of safety and disinformation work, including tools such as Shield for journalists and Assembler, which helped identify manipulated images.`,
      `Jigsaw's design team was small, so my role stretched across management and creative direction. I led a few internal designers and researchers while directing external partners such as Digital Domain across VR production, branding, research, and physical experiences. The range pushed me beyond individual interfaces and taught me to connect product design, identity, storytelling, and real-world experiences around a shared mission. It also showed me the reach of design when the output was evidence, influence, or a change to another team's roadmap rather than a conventional product.`,
      `That model was meaningful, but after several years I missed the feedback loop of shipping something directly to people. Research and development could reveal an important truth without giving me the authority to turn it into a sustained consumer experience. I had also begun exploring privacy-preserving technology and on-device computing as alternatives to the extractive models surrounding content and misinformation. Canopy brought those threads together: a small team, a consumer product, and a chance to build a healthier form of personalized discovery from the ground up.`,
    ],
  },
  {
    title: 'Building with Privacy',
    paragraphs: [
      `The desire to ship again led me from Google's research environment to Canopy. The company was built around differential privacy and on-device computing—the same kinds of technologies I had begun exploring while working on misinformation. This time they were aimed at a familiar consumer problem: how people discover content. It felt like a return to the concentrated ownership I had experienced at Automatic, but with a mission shaped by everything I had learned about attention, privacy, and the unintended consequences of large platforms.`,
      `As Canopy's only designer, I worked across the brand, website, product strategy, and mobile experience. Our primary proof of concept became Tonic, a recommendation app that combined machine learning with human editorial judgment. Instead of an infinite feed, it offered five recommendations each day: four selected around what the system believed you would enjoy and one wildcard intended to expand your interests. The goal was not to maximize time spent. It was to help someone find a small number of things genuinely worth reading and perhaps leave with a better story to tell at dinner.`,
      `We tried to make the recommendation system legible and correctable. People could see how strongly Tonic believed they liked something, change that signal, swap recommendations, and send anonymous feedback directly to our team. Those choices made personalization feel more like a relationship the user could shape than an invisible system acting on them. The audience was small but unusually passionate, and the product earned recognition far beyond the size of our team. That response validated the product and the underlying privacy-first approach. It also attracted CNN, which acquired Canopy and brought the entire team into its emerging products group to apply the same thinking to news.`,
    ],
  },
  {
    title: 'Rethinking News',
    paragraphs: [
      `Canopy's acquisition moved the entire team into CNN's emerging products and platforms division. Our project, code-named NewsCo, was an attempt to combine Canopy's recommendation technology with a mobile-first, participatory approach to news. We imagined news consumption as something more active than receiving a finished broadcast: people could contribute, surface perspectives, and understand an event through the knowledge of a community. The problem connected content, recommendations, and creator dynamics in a way that felt like a natural expansion of what we had built at Canopy.`,
      `I went from being Canopy's only designer to leading a small multidisciplinary group of product designers, design engineers, and researchers. Together we built an app and released it to a limited cohort, using the pilot to understand whether crowdsourced reporting could remain useful, trustworthy, and comprehensible on a phone. The work asked us to balance the speed and openness of participation with the responsibility people expect from a news organization. It also returned me to management, now with years of product leadership and organizational experience behind me.`,
      `Soon afterward, CNN entered a major restructuring. Leadership changed, NewsCo was abandoned, and our team was redirected toward what became CNN+. The shift showed me how quickly the purpose of a product can be displaced by the strategy of the institution surrounding it. I had left Google to pursue mission-aligned consumer products, but suddenly found myself responsible for advancing CNN's corporate priorities instead. The work remained complex, yet the reason I had joined Canopy no longer existed inside it. Rather than allow momentum to make the decision for me, I left to find a company whose business model and mission were more closely aligned. Patreon, with its direct commitment to creators, felt like that place.`,
    ],
  },
  {
    title: 'Designing for Creators',
    paragraphs: [
      `Leaving CNN brought me back to a question that had followed me from Facebook and Google: what happens when a company's incentives truly support the people using the product? Patreon offered a compelling answer. Its business succeeded when creators succeeded, rather than when an advertising system captured more of their attention. The company was led by a musician and filled with people who cared deeply about creativity. After years spent working on content, recommendations, and participation, the mission felt both familiar and more closely aligned with my values.`,
      `I joined a design team of three with an opportunity to rebuild the product from the ground up. Working with the founders, I helped develop the Patreon 2.0 vision and led major changes to the mobile apps, navigation, information architecture, creator onboarding, and audio experience. The Studio design system introduced semantic color, typography, more than 650 handcrafted icons, and shared mobile and web components. The navigation work had to support people moving between creator and member identities without making an already complex product feel heavier. Later efforts, including Communities, created more direct ways for creators and audiences to connect.`,
      `The product transformation required an organizational one. I helped grow the core design team from three to fifteen and the broader group across product design, research, and content design to roughly twenty-five people. I interviewed every designer and played a direct role in bringing them onto the team and into the culture we were building. The design system, information architecture, and mobile redesigns are the clearest artifacts of my impact, but I am equally proud of assembling a team capable of carrying that standard forward without me.`,
      `Patreon's mission also began to work on me personally. Every day, we encouraged creators to leave conventional jobs, build direct relationships with their audiences, and make sustainable lives around the work they loved. Eventually I had to ask why I was not applying the same idea to myself. Looking across my career, I could see that my best work consistently happened near the beginning—when the product was undefined, the team was small, and design needed to connect strategy, storytelling, systems, and execution. That realization became the foundation for Valdivia Works.`,
    ],
  },
  {
    title: 'An Independent Practice',
    paragraphs: [
      `The idea behind Valdivia Works came directly from the lesson I had helped Patreon teach other people: a creative life could be designed around the work itself. I wanted an environment that preserved the range I had repeatedly found in early-stage companies without requiring me to surrender it as those companies matured. The pattern was clear. I was most useful when a founder had an ambitious but unformed idea and needed someone who could move fluidly between product strategy, brand, interaction design, prototyping, systems, and the details required to ship.`,
      `Working fractionally turns that breadth into the job rather than an exception to it. Early-stage teams gain access to experience they often could not hire full-time, and I can enter at the moment when the right product decision has the most leverage. My role is not simply to make the interface attractive. It is to help a team sharpen the idea, prototype the right paths quickly, turn complexity into a story people can understand, and establish the systems and habits that raise the quality of everything that follows. Work with teams such as Daylight, Workmate, Slingshot, and Google Ventures has let me apply that approach across very different products without giving up shared ownership or depth.`,
      `Over the last year, I have also aimed those skills at products of my own. Building for myself creates a different kind of accountability: there is no client brief to hide behind, and every decision about purpose, scope, craft, and distribution belongs to me. The process sharpens my judgment and produces lessons that flow directly back into client work. Client challenges, in turn, expose me to new technologies, teams, and constraints that make my own products stronger. The two practices form a symbiotic loop rather than competing paths.`,
      `This chapter is still being written, but it feels less like a departure from the rest of my career than a synthesis of it. The creative inheritance of my childhood, the adaptability learned through immigration, the craft of school, the speed of agencies, the ownership of startups, the scale of large companies, and the search for meaningful work all meet here. Valdivia Works gives me a way to keep beginning again—only now, the environment that makes that possible is one I designed for myself.`,
    ],
  },
] as const

const CHAPTER_YEARS = new Set(
  CHAPTER_STARTS.map((timestamp) => new Date(timestamp).getUTCFullYear()),
)
const YEAR_TICKS = Array.from(
  { length: (PRESENT_YEAR - BIRTH_YEAR) * TICKS_PER_YEAR + 1 },
  (_, index) => ({
    id: index === 0 ? 'prologue' : `year-${BIRTH_YEAR + index}`,
    position: index / ((PRESENT_YEAR - BIRTH_YEAR) * TICKS_PER_YEAR),
    year: BIRTH_YEAR + index,
    isChapter: index === 0,
    compactIndex: index === 0 ? 0 : null,
  }),
).filter(({ year }) => !CHAPTER_YEARS.has(year))
const CHAPTER_TICKS = CHAPTER_STARTS.map((timestamp, index) => ({
  id: `chapter-${index + 1}`,
  position: (timestamp - BIRTH_TIMESTAMP) / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
  year: new Date(timestamp).getUTCFullYear(),
  isChapter: true,
  compactIndex: index + 1,
}))
const RAIL_TICKS = [...YEAR_TICKS, ...CHAPTER_TICKS]
  .sort((a, b) => a.position - b.position)

const getNearestTickIndex = (position: number) => {
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  RAIL_TICKS.forEach((tick, index) => {
    const distance = Math.abs(tick.position - position)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  return nearestIndex
}

export function TimelineExperience() {
  const lastIndex = PRESENT_YEAR - BIRTH_YEAR
  const [displayPosition, setDisplayPosition] = useState(lastIndex)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [isTimelineDragging, setIsTimelineDragging] = useState(false)
  const [isDateEditing, setIsDateEditing] = useState(false)
  const [dateDraft, setDateDraft] = useState('')
  const hoverProgressRef = useRef<number | null>(null)
  const targetRef = useRef(lastIndex)
  const positionRef = useRef(lastIndex)
  const animationRef = useRef<number | null>(null)
  const experienceRef = useRef<HTMLElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const storyRef = useRef<HTMLElement | null>(null)
  const chapterScrollRef = useRef<HTMLDivElement | null>(null)
  const chapterMotionRef = useRef<HTMLDivElement | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const hoverLockRef = useRef(false)
  const hapticTickRef = useRef<number | null>(null)
  const scrollSyncLockRef = useRef(false)
  const scrollSyncFrameRef = useRef<number | null>(null)
  const chapterPullDistanceRef = useRef(0)
  const chapterPullDirectionRef = useRef(0)
  const chapterPullIdleTimerRef = useRef<number | null>(null)
  const chapterMotionCleanupTimerRef = useRef<number | null>(null)
  const chapterTransitionTimerRef = useRef<number | null>(null)
  const chapterEnterFrameRef = useRef<number | null>(null)
  const chapterTransitioningRef = useRef(false)
  const chapterTransitionDirectionRef = useRef(0)
  const chapterTransitionMinimumEndRef = useRef(0)
  const chapterWheelUnlockTimerRef = useRef<number | null>(null)
  const chapterWheelHandlerRef = useRef<(event: WheelEvent) => void>(() => {})
  const chapterDeltaHandlerRef = useRef<(
    deltaY: number,
    preventDefault: () => void,
  ) => void>(() => {})
  const previousChapterCueRef = useRef<HTMLDivElement | null>(null)
  const nextChapterCueRef = useRef<HTMLDivElement | null>(null)
  const mobilePreviousChapterCueRef = useRef<HTMLDivElement | null>(null)
  const mobileNextChapterCueRef = useRef<HTMLDivElement | null>(null)
  const pendingChapterScrollRef = useRef<{ index: number; ratio: number } | null>(null)
  const urlDateReadyRef = useRef(false)
  const pendingUrlDateRef = useRef<string | null>(null)
  const urlSyncTimerRef = useRef<number | null>(null)

  const getChapterScrollElement = () => {
    if (typeof window === 'undefined') return chapterScrollRef.current
    if (window.matchMedia('(min-width: 1280px)').matches) {
      return chapterScrollRef.current
    }
    if (window.matchMedia('(min-width: 810px)').matches) {
      return storyRef.current
    }
    return stageRef.current
  }

  const prepareHapticPosition = useCallback((position: number) => {
    hapticTickRef.current = getNearestTickIndex(position)
  }, [])

  const pulseHapticAt = useCallback((position: number) => {
    const nextTickIndex = getNearestTickIndex(position)
    const previousTickIndex = hapticTickRef.current

    if (previousTickIndex === null) {
      hapticTickRef.current = nextTickIndex
      return
    }

    if (nextTickIndex === previousTickIndex) return

    const firstCrossedIndex = Math.min(previousTickIndex, nextTickIndex)
    const lastCrossedIndex = Math.max(previousTickIndex, nextTickIndex)
    const crossedChapter = RAIL_TICKS
      .slice(firstCrossedIndex, lastCrossedIndex + 1)
      .some((tick) => tick.isChapter)

    hapticTickRef.current = nextTickIndex
    navigator.vibrate?.(crossedChapter ? 12 : 5)
  }, [])

  const animate = useCallback(() => {
    const distance = targetRef.current - positionRef.current
    const next = Math.abs(distance) < 0.002
      ? targetRef.current
      : positionRef.current + distance * 0.16

    positionRef.current = next
    setDisplayPosition(next)

    if (next !== targetRef.current) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      animationRef.current = null
    }
  }, [])

  const moveTo = useCallback((next: number) => {
    targetRef.current = Math.max(0, Math.min(lastIndex, next))

    if (animationRef.current === null) {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [animate, lastIndex])

  const snapTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(lastIndex, next))
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    targetRef.current = clamped
    positionRef.current = clamped
    setDisplayPosition(clamped)
  }, [lastIndex])

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
      if (scrollSyncFrameRef.current !== null) cancelAnimationFrame(scrollSyncFrameRef.current)
      if (chapterEnterFrameRef.current !== null) cancelAnimationFrame(chapterEnterFrameRef.current)
      if (chapterPullIdleTimerRef.current !== null) window.clearTimeout(chapterPullIdleTimerRef.current)
      if (chapterMotionCleanupTimerRef.current !== null) {
        window.clearTimeout(chapterMotionCleanupTimerRef.current)
      }
      if (chapterTransitionTimerRef.current !== null) {
        window.clearTimeout(chapterTransitionTimerRef.current)
      }
      if (chapterWheelUnlockTimerRef.current !== null) {
        window.clearTimeout(chapterWheelUnlockTimerRef.current)
      }
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current)
      }
    }
  }, [])

  const progress = displayPosition / lastIndex
  const pillProgress = hoverProgress ?? progress
  const contentTimestamp = Math.round(
    BIRTH_TIMESTAMP + progress * (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
  )
  const contentDate = new Date(contentTimestamp)
  const contentYear = contentDate.getUTCFullYear()
  const isBeforeBirthday = contentDate.getUTCMonth() < 2
    || (contentDate.getUTCMonth() === 2 && contentDate.getUTCDate() < 23)
  const contentAge = contentYear - BIRTH_YEAR - (isBeforeBirthday ? 1 : 0)
  const contentAgeLabel = contentAge === 0 ? 'Newborn' : contentAge
  const contentDateLabel = FULL_DATE_FORMATTER.format(contentDate)
  const contentDateTime = contentDate.toISOString().slice(0, 10)
  const pillTimestamp = Math.round(
    BIRTH_TIMESTAMP + pillProgress * (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
  )
  const pillLabel = PILL_DATE_FORMATTER.format(new Date(pillTimestamp))
  const locationDetails = getPeriodLabel(LOCATION_HISTORY, contentYear)
  const educationDetails = getPeriodLabel(EDUCATION_HISTORY, contentYear)
  const workDetails = getDatedPeriodLabel(WORK_HISTORY, contentDate.getTime())
  const contentChapterIndex = getChapterIndex(contentDate.getTime())
  const contentChapterLabel = contentChapterIndex === 0
    ? 'Prologue'
    : `Chapter ${contentChapterIndex}`
  const contentChapterRangeLabel = getChapterRangeLabel(contentChapterIndex)
  const contentTitle = CHAPTER_CONTENT[contentChapterIndex].title
  const contentParagraphs = CHAPTER_CONTENT[contentChapterIndex].paragraphs
  const worldContext = LOCATION_CONTEXT?.[locationDetails]?.[contentYear]
  const worldContextWikipediaHref = worldContext
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(worldContext.summary)}`
    : null
  const previousChapterLabel = contentChapterIndex === 1
    ? 'Prologue'
    : `Chapter ${contentChapterIndex - 1}`
  const nextChapterLabel = `Chapter ${contentChapterIndex + 1}`

  const getChapterTimestampRange = (chapterIndex: number) => {
    const start = CHAPTER_BOUNDARIES[chapterIndex]
    const boundaryEnd = CHAPTER_BOUNDARIES[chapterIndex + 1] ?? PRESENT_TIMESTAMP
    const end = chapterIndex === CHAPTER_BOUNDARIES.length - 1
      ? boundaryEnd
      : boundaryEnd - 1

    return { start, end }
  }

  const clearChapterMotionCleanup = () => {
    if (chapterMotionCleanupTimerRef.current !== null) {
      window.clearTimeout(chapterMotionCleanupTimerRef.current)
      chapterMotionCleanupTimerRef.current = null
    }
  }

  const scheduleChapterWheelUnlock = (quietTime = CHAPTER_WHEEL_QUIET_MS) => {
    if (chapterWheelUnlockTimerRef.current !== null) {
      window.clearTimeout(chapterWheelUnlockTimerRef.current)
    }

    const animationTimeRemaining = Math.max(
      0,
      chapterTransitionMinimumEndRef.current - performance.now(),
    )
    chapterWheelUnlockTimerRef.current = window.setTimeout(() => {
      getChapterScrollElement()?.style.removeProperty('overflow-y')
      chapterTransitioningRef.current = false
      chapterTransitionDirectionRef.current = 0
      chapterWheelUnlockTimerRef.current = null
    }, Math.max(quietTime, animationTimeRemaining))
  }

  const resetChapterCues = () => {
    ;[
      previousChapterCueRef.current,
      nextChapterCueRef.current,
      mobilePreviousChapterCueRef.current,
      mobileNextChapterCueRef.current,
    ].forEach((cue) => {
      cue?.style.removeProperty('opacity')
      cue?.style.removeProperty('transform')
      cue?.style.removeProperty('will-change')
    })
  }

  const releaseChapterMotion = () => {
    resetChapterCues()

    const motion = chapterMotionRef.current
    if (!motion) return

    clearChapterMotionCleanup()
    motion.style.willChange = 'transform'
    motion.style.transition = `transform 360ms ${CHAPTER_MOTION_EASE}`
    motion.style.transform = 'translate3d(0, 0, 0)'
    chapterMotionCleanupTimerRef.current = window.setTimeout(() => {
      motion.style.removeProperty('transition')
      motion.style.removeProperty('transform')
      motion.style.removeProperty('will-change')
      chapterMotionCleanupTimerRef.current = null
    }, 380)
  }

  useEffect(() => {
    resetChapterCues()

    const element = getChapterScrollElement()
    if (!element) return

    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight)
    const pendingScroll = pendingChapterScrollRef.current
    const { start, end } = getChapterTimestampRange(contentChapterIndex)
    const selectedTimestamp = Math.round(
      BIRTH_TIMESTAMP
        + (positionRef.current / lastIndex) * (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
    )
    const selectedRatio = end === start
      ? 0
      : Math.max(0, Math.min(1, (selectedTimestamp - start) / (end - start)))
    const resetMobileChapter = hoverProgressRef.current !== null
      && window.matchMedia('(max-width: 809px)').matches
    const scrollRatio = resetMobileChapter
      ? 0
      : pendingScroll?.index === contentChapterIndex
        ? pendingScroll.ratio
        : selectedRatio

    if (pendingScroll?.index === contentChapterIndex) {
      pendingChapterScrollRef.current = null
    }

    scrollSyncLockRef.current = true
    element.scrollTop = scrollRatio * maxScroll

    if (scrollSyncFrameRef.current !== null) {
      cancelAnimationFrame(scrollSyncFrameRef.current)
    }
    scrollSyncFrameRef.current = requestAnimationFrame(() => {
      scrollSyncLockRef.current = false
      scrollSyncFrameRef.current = null
    })

    const transitionDirection = chapterTransitionDirectionRef.current
    const motion = chapterMotionRef.current
    if (motion && transitionDirection !== 0) {
      if (chapterEnterFrameRef.current !== null) {
        cancelAnimationFrame(chapterEnterFrameRef.current)
      }
      clearChapterMotionCleanup()
      chapterTransitionMinimumEndRef.current = Math.max(
        chapterTransitionMinimumEndRef.current,
        performance.now() + CHAPTER_ENTER_DURATION + 40,
      )
      motion.style.willChange = 'transform, opacity'
      motion.style.transition = 'none'
      motion.style.opacity = '0'
      motion.style.transform = `translate3d(0, ${transitionDirection * 48}px, 0)`
      chapterEnterFrameRef.current = requestAnimationFrame(() => {
        motion.style.transition = `transform ${CHAPTER_ENTER_DURATION}ms ${CHAPTER_MOTION_EASE}, opacity 300ms ease-out`
        motion.style.opacity = '1'
        motion.style.transform = 'translate3d(0, 0, 0)'
        chapterEnterFrameRef.current = null
      })
      chapterMotionCleanupTimerRef.current = window.setTimeout(() => {
        motion.style.removeProperty('transition')
        motion.style.removeProperty('transform')
        motion.style.removeProperty('opacity')
        motion.style.removeProperty('will-change')
        chapterMotionCleanupTimerRef.current = null
        scheduleChapterWheelUnlock(
          transitionDirection < 0
            ? CHAPTER_BACKWARD_WHEEL_QUIET_MS
            : CHAPTER_WHEEL_QUIET_MS,
        )
      }, CHAPTER_ENTER_DURATION + 40)
    }
  }, [contentChapterIndex, lastIndex])

  const moveToChapter = (chapterIndex: number, scrollRatio = 0) => {
    const nextChapterIndex = Math.max(
      0,
      Math.min(CHAPTER_BOUNDARIES.length - 1, chapterIndex),
    )
    const { start, end } = getChapterTimestampRange(nextChapterIndex)
    const clampedScrollRatio = Math.max(0, Math.min(1, scrollRatio))
    const timestamp = Math.round(start + (end - start) * clampedScrollRatio)
    const nextProgress = (timestamp - BIRTH_TIMESTAMP)
      / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP)

    pendingChapterScrollRef.current = {
      index: nextChapterIndex,
      ratio: clampedScrollRatio,
    }
    const chapterScroll = getChapterScrollElement()
    if (chapterScroll && clampedScrollRatio === 0) {
      scrollSyncLockRef.current = true
      chapterScroll.scrollTop = 0
      if (scrollSyncFrameRef.current !== null) {
        cancelAnimationFrame(scrollSyncFrameRef.current)
      }
      scrollSyncFrameRef.current = requestAnimationFrame(() => {
        scrollSyncLockRef.current = false
        scrollSyncFrameRef.current = null
      })
    }
    hoverProgressRef.current = null
    setHoverProgress(null)
    setIsTimelineDragging(false)
    moveTo(nextProgress * lastIndex)
    navigator.vibrate?.(12)
  }

  const cancelDateEdit = () => {
    setIsDateEditing(false)
    setDateDraft('')
  }

  const navigateToDate = (dateValue = dateDraft) => {
    const [year, month, day] = dateValue.split('-').map(Number)
    if (!year || !month || !day) {
      cancelDateEdit()
      return
    }

    const requestedTimestamp = Date.UTC(year, month - 1, day)
    if (new Date(requestedTimestamp).toISOString().slice(0, 10) !== dateValue) {
      cancelDateEdit()
      return
    }

    const timestamp = Math.max(
      BIRTH_TIMESTAMP,
      Math.min(PRESENT_TIMESTAMP, requestedTimestamp),
    )
    const nextChapterIndex = getChapterIndex(timestamp)
    const { start, end } = getChapterTimestampRange(nextChapterIndex)
    const scrollRatio = end === start
      ? 0
      : Math.max(0, Math.min(1, (timestamp - start) / (end - start)))
    const nextProgress = (timestamp - BIRTH_TIMESTAMP)
      / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP)

    if (nextChapterIndex === contentChapterIndex) {
      pendingChapterScrollRef.current = null
      const chapterScroll = getChapterScrollElement()
      if (chapterScroll) {
        const maxScroll = Math.max(0, chapterScroll.scrollHeight - chapterScroll.clientHeight)
        scrollSyncLockRef.current = true
        chapterScroll.scrollTop = scrollRatio * maxScroll
        if (scrollSyncFrameRef.current !== null) {
          cancelAnimationFrame(scrollSyncFrameRef.current)
        }
        scrollSyncFrameRef.current = requestAnimationFrame(() => {
          scrollSyncLockRef.current = false
          scrollSyncFrameRef.current = null
        })
      }
    } else {
      pendingChapterScrollRef.current = {
        index: nextChapterIndex,
        ratio: scrollRatio,
      }
    }

    setIsDateEditing(false)
    setDateDraft('')
    hoverProgressRef.current = null
    setHoverProgress(null)
    moveTo(nextProgress * lastIndex)
    navigator.vibrate?.(12)
  }

  useEffect(() => {
    const requestedDate = new URL(window.location.href).searchParams.get('date')
    if (!requestedDate) {
      urlDateReadyRef.current = true
      return
    }

    const [year, month, day] = requestedDate.split('-').map(Number)
    if (!year || !month || !day) {
      urlDateReadyRef.current = true
      return
    }

    const requestedTimestamp = Date.UTC(year, month - 1, day)
    if (new Date(requestedTimestamp).toISOString().slice(0, 10) !== requestedDate) {
      urlDateReadyRef.current = true
      return
    }

    const timestamp = Math.max(
      BIRTH_TIMESTAMP,
      Math.min(PRESENT_TIMESTAMP, requestedTimestamp),
    )
    const normalizedDate = new Date(timestamp).toISOString().slice(0, 10)
    pendingUrlDateRef.current = normalizedDate
    navigateToDate(normalizedDate)
  }, [])

  useEffect(() => {
    const pendingDate = pendingUrlDateRef.current
    if (pendingDate && contentDateTime !== pendingDate) return

    if (pendingDate) {
      pendingUrlDateRef.current = null
      urlDateReadyRef.current = true
    }
    if (!urlDateReadyRef.current) return

    if (urlSyncTimerRef.current !== null) {
      window.clearTimeout(urlSyncTimerRef.current)
    }
    urlSyncTimerRef.current = window.setTimeout(() => {
      const url = new URL(window.location.href)
      if (url.searchParams.get('date') === contentDateTime) {
        urlSyncTimerRef.current = null
        return
      }
      url.searchParams.set('date', contentDateTime)
      window.history.replaceState(window.history.state, '', url)
      urlSyncTimerRef.current = null
    }, 80)

    return () => {
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current)
        urlSyncTimerRef.current = null
      }
    }
  }, [contentDateTime])

  const handleChapterScroll = (event: React.UIEvent<HTMLElement>) => {
    const element = event.currentTarget
    if (element !== getChapterScrollElement()) return
    element.dataset.scrolled = element.scrollTop > 1 ? 'true' : 'false'
    if (chapterTransitioningRef.current) return

    if (scrollSyncLockRef.current) return

    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight)
    if (maxScroll === 0) return

    const scrollRatio = Math.max(0, Math.min(1, element.scrollTop / maxScroll))
    const { start, end } = getChapterTimestampRange(contentChapterIndex)
    const timestamp = Math.round(start + (end - start) * scrollRatio)
    const nextPosition = ((timestamp - BIRTH_TIMESTAMP)
      / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP)) * lastIndex

    if (hoverProgressRef.current !== null) {
      hoverProgressRef.current = null
      setHoverProgress(null)
    }

    snapTo(nextPosition)
    pulseHapticAt(nextPosition / lastIndex)

    if (scrollRatio > 0.01 && scrollRatio < 0.99) {
      const wasPulling = chapterPullDistanceRef.current !== 0
        || chapterPullDirectionRef.current !== 0
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = 0
      if (chapterPullIdleTimerRef.current !== null) {
        window.clearTimeout(chapterPullIdleTimerRef.current)
        chapterPullIdleTimerRef.current = null
      }
      if (wasPulling) releaseChapterMotion()
    }
  }

  const handleChapterDelta = (deltaY: number, preventDefault: () => void) => {
    if (deltaY === 0) return
    if (chapterTransitioningRef.current) {
      preventDefault()
      if (chapterTransitionDirectionRef.current < 0) {
        scheduleChapterWheelUnlock(CHAPTER_BACKWARD_WHEEL_QUIET_MS)
      }
      return
    }

    const element = getChapterScrollElement()
    if (!element) return
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight)
    const direction = Math.sign(deltaY)
    const atStart = element.scrollTop <= 1
    const atEnd = element.scrollTop >= maxScroll - 1
    const pullingPastEdge = direction < 0 ? atStart : atEnd
    const nextChapterIndex = contentChapterIndex + direction
    const canChangeChapter = nextChapterIndex >= 0
      && nextChapterIndex < CHAPTER_BOUNDARIES.length

    if (!pullingPastEdge || !canChangeChapter) {
      const wasPulling = chapterPullDistanceRef.current !== 0
        || chapterPullDirectionRef.current !== 0
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = 0
      if (wasPulling) releaseChapterMotion()
      return
    }

    preventDefault()

    if (chapterPullDirectionRef.current !== direction) {
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = direction
    }

    chapterPullDistanceRef.current += Math.abs(deltaY)
    const pullThreshold = window.matchMedia('(max-width: 809px)').matches
      ? MOBILE_CHAPTER_PULL_THRESHOLD
      : CHAPTER_PULL_THRESHOLD
    const pullProgress = Math.min(
      1,
      chapterPullDistanceRef.current / pullThreshold,
    )
    const signedPull = chapterPullDistanceRef.current * direction
    const elasticOffset = CHAPTER_PULL_MAX_OFFSET
      * Math.sign(signedPull)
      * (1 - Math.exp(-Math.abs(signedPull) / CHAPTER_PULL_DAMPING))
    const motion = chapterMotionRef.current
    const activeCues = direction < 0
      ? [previousChapterCueRef.current, mobilePreviousChapterCueRef.current]
      : [nextChapterCueRef.current, mobileNextChapterCueRef.current]
    const inactiveCues = direction < 0
      ? [nextChapterCueRef.current, mobileNextChapterCueRef.current]
      : [previousChapterCueRef.current, mobilePreviousChapterCueRef.current]
    const mobileActiveCue = direction < 0
      ? mobilePreviousChapterCueRef.current
      : mobileNextChapterCueRef.current
    const cueOffset = -CHAPTER_CUE_PULL_MAX_OFFSET
      * (1 - Math.exp(-Math.abs(signedPull) / CHAPTER_CUE_PULL_DAMPING))
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    activeCues.forEach((cue) => {
      if (cue) cue.style.opacity = `${pullProgress}`
    })
    inactiveCues.forEach((cue) => {
      cue?.style.removeProperty('opacity')
      cue?.style.removeProperty('transform')
      cue?.style.removeProperty('will-change')
    })
    if (mobileActiveCue && !prefersReducedMotion) {
      mobileActiveCue.style.willChange = 'transform, opacity'
      mobileActiveCue.style.transform = `translate3d(-50%, ${cueOffset}px, 0)`
    }

    if (motion && !prefersReducedMotion) {
      clearChapterMotionCleanup()
      motion.style.willChange = 'transform'
      motion.style.transition = 'transform 80ms linear'
      motion.style.transform = `translate3d(0, ${-elasticOffset}px, 0)`
    }

    if (chapterPullIdleTimerRef.current !== null) {
      window.clearTimeout(chapterPullIdleTimerRef.current)
    }
    chapterPullIdleTimerRef.current = window.setTimeout(() => {
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = 0
      chapterPullIdleTimerRef.current = null
      releaseChapterMotion()
    }, 260)

    if (chapterPullDistanceRef.current < pullThreshold) return

    chapterPullDistanceRef.current = 0
    chapterPullDirectionRef.current = 0
    if (chapterPullIdleTimerRef.current !== null) {
      window.clearTimeout(chapterPullIdleTimerRef.current)
      chapterPullIdleTimerRef.current = null
    }

    element.style.overflowY = 'hidden'

    if (prefersReducedMotion || !motion) {
      chapterTransitioningRef.current = true
      chapterTransitionDirectionRef.current = direction
      chapterTransitionMinimumEndRef.current = performance.now()
      moveToChapter(nextChapterIndex, 0)
      scheduleChapterWheelUnlock(
        direction < 0 ? CHAPTER_BACKWARD_WHEEL_QUIET_MS : CHAPTER_WHEEL_QUIET_MS,
      )
      return
    }

    chapterTransitioningRef.current = true
    chapterTransitionDirectionRef.current = direction
    chapterTransitionMinimumEndRef.current = performance.now()
      + CHAPTER_EXIT_DURATION
      + CHAPTER_ENTER_DURATION
      + 40
    if (chapterWheelUnlockTimerRef.current !== null) {
      window.clearTimeout(chapterWheelUnlockTimerRef.current)
      chapterWheelUnlockTimerRef.current = null
    }
    motion.style.willChange = 'transform, opacity'
    motion.style.transition = `transform ${CHAPTER_EXIT_DURATION}ms ${CHAPTER_MOTION_EASE}, opacity 160ms ease-out`
    motion.style.opacity = '0'
    motion.style.transform = `translate3d(0, ${-direction * 64}px, 0)`
    chapterTransitionTimerRef.current = window.setTimeout(() => {
      chapterTransitionTimerRef.current = null
      moveToChapter(nextChapterIndex, 0)
    }, CHAPTER_EXIT_DURATION)
  }

  const handleChapterWheel = (event: WheelEvent) => {
    handleChapterDelta(event.deltaY, () => event.preventDefault())
  }

  chapterWheelHandlerRef.current = handleChapterWheel
  chapterDeltaHandlerRef.current = handleChapterDelta

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => chapterWheelHandlerRef.current(event)
    let previousTouchY: number | null = null
    const handleTouchStart = (event: TouchEvent) => {
      previousTouchY = event.touches[0]?.clientY ?? null
    }
    const handleTouchMove = (event: TouchEvent) => {
      const nextTouchY = event.touches[0]?.clientY
      if (previousTouchY === null || nextTouchY === undefined) return
      const deltaY = previousTouchY - nextTouchY
      previousTouchY = nextTouchY
      chapterDeltaHandlerRef.current(deltaY, () => event.preventDefault())
    }
    const handleTouchEnd = () => {
      previousTouchY = null
    }
    const wideQuery = window.matchMedia('(min-width: 1280px)')
    const compactQuery = window.matchMedia('(min-width: 810px) and (max-width: 1279px)')
    let element: HTMLElement | null = null

    const bindScrollInput = () => {
      if (element) {
        element.removeEventListener('wheel', handleWheel)
        element.removeEventListener('touchstart', handleTouchStart)
        element.removeEventListener('touchmove', handleTouchMove)
        element.removeEventListener('touchend', handleTouchEnd)
        element.removeEventListener('touchcancel', handleTouchEnd)
      }

      element = getChapterScrollElement()
      element?.addEventListener('wheel', handleWheel, { passive: false })
      element?.addEventListener('touchstart', handleTouchStart, { passive: true })
      element?.addEventListener('touchmove', handleTouchMove, { passive: false })
      element?.addEventListener('touchend', handleTouchEnd, { passive: true })
      element?.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    }

    bindScrollInput()
    wideQuery.addEventListener('change', bindScrollInput)
    compactQuery.addEventListener('change', bindScrollInput)

    return () => {
      wideQuery.removeEventListener('change', bindScrollInput)
      compactQuery.removeEventListener('change', bindScrollInput)
      if (!element) return
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [])

  const getPointerRatio = (clientX: number, clientY: number) => {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect) return null
    const horizontal = rect.width > rect.height

    return horizontal
      ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      : Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
  }

  const positionHoverPopover = (clientY: number) => {
    const rect = experienceRef.current?.getBoundingClientRect()
    if (!rect) return

    experienceRef.current?.style.setProperty(
      '--popover-y',
      `${clientY - rect.top}px`,
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const ratio = getPointerRatio(event.clientX, event.clientY)
    if (ratio === null) return
    const rect = railRef.current?.getBoundingClientRect()
    const isHorizontal = rect ? rect.width > rect.height : false

    event.currentTarget.setPointerCapture(event.pointerId)
    setIsTimelineDragging(true)
    positionHoverPopover(event.clientY)
    prepareHapticPosition(ratio)
    hoverProgressRef.current = ratio
    setHoverProgress(ratio)

    if (!isHorizontal) {
      hoverLockRef.current = true
      snapTo(ratio * lastIndex)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = railRef.current?.getBoundingClientRect()
    const isHorizontal = rect ? rect.width > rect.height : false
    const isDragging = event.currentTarget.hasPointerCapture(event.pointerId)
    const showsHoverPopover = window.matchMedia(
      '(min-width: 810px) and (max-width: 1279px)',
    ).matches

    if (isHorizontal && !isDragging) return
    if (!isHorizontal && hoverLockRef.current && !isDragging && !showsHoverPopover) return

    const ratio = getPointerRatio(event.clientX, event.clientY)
    if (ratio === null) return
    if (showsHoverPopover) {
      positionHoverPopover(event.clientY)
    }
    hoverProgressRef.current = ratio
    setHoverProgress(ratio)

    if (showsHoverPopover) {
      snapTo(ratio * lastIndex)
    } else if (isDragging) {
      if (isHorizontal) {
        moveTo(ratio * lastIndex)
      } else {
        snapTo(ratio * lastIndex)
      }
      pulseHapticAt(ratio)
    }
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    hoverProgressRef.current = null
    hapticTickRef.current = null
    setIsTimelineDragging(false)
    setHoverProgress(null)
  }

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      hoverLockRef.current = false
      hoverProgressRef.current = null
      hapticTickRef.current = null
      setIsTimelineDragging(false)
      setHoverProgress(null)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, number> = {
      ArrowUp: -1,
      ArrowLeft: -1,
      ArrowDown: 1,
      ArrowRight: 1,
      PageUp: -5,
      PageDown: 5,
    }

    if (event.key in offsets) {
      event.preventDefault()
      const next = Math.round(targetRef.current) + offsets[event.key]
      moveTo(next)
      pulseHapticAt(Math.max(0, Math.min(1, next / lastIndex)))
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveTo(0)
      pulseHapticAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveTo(lastIndex)
      pulseHapticAt(1)
    }
  }

  return (
    <section
      ref={experienceRef}
      className={styles.experience}
      style={{
        '--timeline-progress': progress,
        '--timeline-percent': `${progress * 100}%`,
        '--pill-percent': `${pillProgress * 100}%`,
        '--compact-timeline-height': `${CHAPTER_STARTS.length * 10 + 1}px`,
      } as React.CSSProperties}
      aria-label="Gabriel Valdivia life timeline"
    >
      <aside className={styles.timelineShell} aria-label="Life timeline">
        <div
          ref={railRef}
          className={styles.timelineRail}
          role="slider"
          tabIndex={0}
          aria-label="Timeline — scrub through Gabriel’s life"
          aria-orientation="vertical"
          aria-valuemin={BIRTH_YEAR}
          aria-valuemax={PRESENT_YEAR}
          aria-valuenow={contentYear}
          aria-valuetext={`${contentDateLabel}. Age ${contentAgeLabel}. Location: ${locationDetails}.${educationDetails !== '—' ? ` Education: ${educationDetails}.` : ''}${workDetails !== '—' ? ` Work: ${workDetails}.` : ''}`}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerLeave}
        >
          <div className={styles.ticks} aria-hidden="true">
            {RAIL_TICKS.map((tick) => {
              const distance = hoverProgress === null ? 1 : Math.abs(tick.position - pillProgress)
              const radius = 0.05
              const influence = distance >= radius
                ? 0
                : Math.cos((distance / radius) * (Math.PI / 2)) ** 2
              const baseWidth = tick.isChapter ? 14 : 6
              const baseOpacity = tick.isChapter ? 0.72 : 0.28
              const tickLength = baseWidth + influence * 14
              const activeCompactIndex = Math.round(pillProgress * CHAPTER_STARTS.length)
              const compactDistance = hoverProgress === null || tick.compactIndex === null
                ? Number.POSITIVE_INFINITY
                : Math.abs(tick.compactIndex - activeCompactIndex)
              const compactLength = compactDistance === 0
                ? 28
                : compactDistance === 1
                  ? 16
                  : compactDistance === 2
                    ? 10
                    : compactDistance === 3
                      ? 8
                      : 6
              const compactOpacity = compactDistance === 0
                ? 1
                : compactDistance === 1
                  ? 0.62
                  : compactDistance === 2
                    ? 0.42
                    : 0.28

              return (
                <span
                  key={tick.id}
                  className={styles.tick}
                  data-chapter={tick.isChapter ? 'true' : 'false'}
                  style={{
                    '--tick-position': `${tick.position * 100}%`,
                    '--tick-compact-position': tick.compactIndex === null
                      ? '0px'
                      : `${tick.compactIndex * 10}px`,
                    '--tick-length': `${tickLength}px`,
                    '--tick-mobile-length': `${tickLength}px`,
                    '--tick-compact-length': `${compactLength}px`,
                    '--tick-compact-opacity': compactOpacity,
                    top: `${tick.position * 100}%`,
                    width: `${tickLength}px`,
                    opacity: baseOpacity + influence * (1 - baseOpacity),
                  } as React.CSSProperties}
                />
              )
            })}
          </div>

          <span
            className={styles.activeTick}
            style={{
              '--active-tick-position': `${pillProgress * 100}%`,
              top: `${pillProgress * 100}%`,
            } as React.CSSProperties}
            aria-hidden="true"
          />

          <span
            className={`${styles.activeDate} ${hoverProgress === null ? styles.restingDate : ''}`}
            style={{ top: `${pillProgress * 100}%` }}
            aria-hidden="true"
          >
            {pillLabel}
          </span>
        </div>
      </aside>

      <div
        ref={stageRef}
        className={styles.stage}
        aria-live="polite"
        aria-atomic="true"
        onScroll={handleChapterScroll}
      >
        <article ref={storyRef} className={styles.story} onScroll={handleChapterScroll}>
          <div
            ref={chapterScrollRef}
            className={styles.chapterHeader}
            onScroll={handleChapterScroll}
          >
            <div ref={chapterMotionRef} className={styles.chapterMotion}>
              <div className={styles.chapterContent}>
                {contentChapterIndex > 0 && (
                  <div
                    ref={previousChapterCueRef}
                    className={`${styles.chapterBoundaryCue} ${styles.previousChapterCue}`}
                    aria-hidden="true"
                  >
                    Back to {previousChapterLabel}
                  </div>
                )}
                <div className={styles.chapterEyebrow}>
                  <span className={styles.chapterEyebrowLabel}>
                    <span>{contentChapterLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{contentChapterRangeLabel}</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Previous chapter"
                    disabled={contentChapterIndex === 0}
                    onClick={() => moveToChapter(contentChapterIndex - 1)}
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next chapter"
                    disabled={contentChapterIndex === CHAPTER_BOUNDARIES.length - 1}
                    onClick={() => moveToChapter(contentChapterIndex + 1)}
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </div>
                <h1>{contentTitle}</h1>
                <div className={styles.chapterDescription}>
                  {contentParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {contentChapterIndex < CHAPTER_BOUNDARIES.length - 1 && (
                  <div
                    ref={nextChapterCueRef}
                    className={`${styles.chapterBoundaryCue} ${styles.nextChapterCue}`}
                    aria-hidden="true"
                  >
                    Continue to {nextChapterLabel}
                  </div>
                )}
              </div>
            </div>
          </div>
          <aside className={styles.detailsColumn}>
            <div className={styles.metaGrid}>
              <div className={styles.eyebrow}>
                <span className={styles.contextHeading}>Date</span>
                <Popover
                  open={isDateEditing}
                  onOpenChange={(open) => {
                    setIsDateEditing(open)
                    setDateDraft(open ? contentDateTime : '')
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={styles.dateButton}
                      aria-label={`Change date. Current date: ${contentDateLabel}`}
                    >
                      <time dateTime={contentDateTime}>{contentDateLabel}</time>
                      <HugeiconsIcon
                        className={styles.dateCalendarIcon}
                        icon={Calendar04Icon}
                        size={20}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={styles.datePopoverContent}
                    align="start"
                    sideOffset={8}
                    onOpenAutoFocus={(event) => {
                      event.preventDefault()
                      dateInputRef.current?.focus()
                    }}
                  >
                    <div className={styles.dateEditor}>
                    <input
                      ref={dateInputRef}
                      className={styles.dateInput}
                      type="text"
                      inputMode="numeric"
                      value={dateDraft}
                      aria-label="Go to date"
                      placeholder="YYYY-MM-DD"
                      onChange={(event) => setDateDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          navigateToDate()
                        } else if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelDateEdit()
                        }
                      }}
                    />
                      <HugeiconsIcon
                        className={styles.dateEditorIcon}
                        icon={Calendar04Icon}
                        size={20}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </div>
                    <Calendar
                      mode="single"
                      defaultMonth={new Date(
                        contentDate.getUTCFullYear(),
                        contentDate.getUTCMonth(),
                        1,
                      )}
                      selected={new Date(
                        contentDate.getUTCFullYear(),
                        contentDate.getUTCMonth(),
                        contentDate.getUTCDate(),
                      )}
                      startMonth={new Date(1987, 2, 1)}
                      endMonth={new Date(2026, 7, 1)}
                      disabled={{
                        before: new Date(1987, 2, 23),
                        after: new Date(2026, 7, 19),
                      }}
                      onSelect={(date) => {
                        if (!date) return
                        const selectedDate = [
                          date.getFullYear(),
                          String(date.getMonth() + 1).padStart(2, '0'),
                          String(date.getDate()).padStart(2, '0'),
                        ].join('-')
                        navigateToDate(selectedDate)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <dl className={styles.details}>
                <div className={styles.ageDetail}>
                  <dt>Age</dt>
                  <dd>{contentAgeLabel}</dd>
                </div>
                <div className={styles.whereDetail}>
                  <dt>Location</dt>
                  <dd>{locationDetails}</dd>
                </div>
                {educationDetails !== '—' && (
                  <div className={styles.educationDetail}>
                    <dt>Education</dt>
                    <dd>{educationDetails}</dd>
                  </div>
                )}
                {workDetails !== '—' && (
                  <div className={styles.workDetail}>
                    <dt>Work</dt>
                    <dd>{workDetails}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className={styles.newsBlock}>
              <span className={styles.contextHeading}>News</span>
              <p className={styles.note}>
                {worldContext && worldContextWikipediaHref ? (
                  <a
                    className={styles.newsLink}
                    href={worldContextWikipediaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.newsLinkText}>{worldContext.summary}</span>
                    <HoverArrow
                      className={styles.newsLinkIcon}
                    />
                  </a>
                ) : 'The story of this year is still being written.'}
              </p>
            </div>
          </aside>
        </article>
      </div>

      {contentChapterIndex > 0 && (
        <div
          key={`mobile-previous-${contentChapterIndex}`}
          ref={mobilePreviousChapterCueRef}
          className={`${styles.mobileChapterBoundaryCue} ${styles.mobilePreviousChapterCue}`}
          aria-hidden="true"
        >
          Back to {previousChapterLabel}
        </div>
      )}
      {contentChapterIndex < CHAPTER_BOUNDARIES.length - 1 && (
        <div
          key={`mobile-next-${contentChapterIndex}`}
          ref={mobileNextChapterCueRef}
          className={`${styles.mobileChapterBoundaryCue} ${styles.mobileNextChapterCue}`}
          aria-hidden="true"
        >
          Continue to {nextChapterLabel}
        </div>
      )}

      {(isTimelineDragging || hoverProgress !== null) && (
        <aside className={styles.mobileSidebarPopover} aria-label="Timeline details">
          <dl className={styles.mobileSidebarGrid}>
            <div>
              <dt>Date</dt>
              <dd>
                <time dateTime={contentDateTime}>{contentDateLabel}</time>
              </dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{contentAgeLabel}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{locationDetails}</dd>
            </div>
            {educationDetails !== '—' && (
              <div>
                <dt>Education</dt>
                <dd>{educationDetails}</dd>
              </div>
            )}
            {workDetails !== '—' && (
              <div>
                <dt>Work</dt>
                <dd>{workDetails}</dd>
              </div>
            )}
            <div className={styles.mobileNews}>
              <dt>News</dt>
              <dd>
                {worldContext && worldContextWikipediaHref ? (
                  <a
                    className={styles.newsLink}
                    href={worldContextWikipediaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.newsLinkText}>{worldContext.summary}</span>
                    <HoverArrow
                      className={styles.newsLinkIcon}
                    />
                  </a>
                ) : 'The story of this year is still being written.'}
              </dd>
            </div>
          </dl>
        </aside>
      )}
    </section>
  )
}
