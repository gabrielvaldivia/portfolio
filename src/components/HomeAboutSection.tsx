import { getAboutPortraits } from '@/lib/aboutBio'
import { AboutBio } from '@/components/AboutBio'
import { AboutContinuity, AboutReadMore, AboutSharedElement } from '@/components/AboutContinuity'
import { SprayPaintPortrait } from '@/components/SprayPaintPortrait'

export function HomeAboutSection({ section }: { section: any }) {
  const { image, darkImage } = getAboutPortraits(section)
  return (
    <section id="about" aria-labelledby="home-about-heading" className="hero-followup-snap-point scroll-mt-8">
      <div className="home-page-content home-page-gutters mx-auto">
        <AboutContinuity>
          <div className="about-intro-grid home-grid items-start">
            <div className="home-grid-sidebar">
              <AboutSharedElement name="portrait">
                <div className="w-full tablet:max-w-[360px]">
                  <SprayPaintPortrait image={image} darkImage={darkImage} />
                </div>
              </AboutSharedElement>
            </div>
            <div className="home-grid-main min-w-0">
              <AboutSharedElement name="bio">
                <div>
                  <div className="flex flex-col gap-6">
                    <h2 id="home-about-heading" className="text-balance">{section.heading}</h2>
                    <AboutBio data={section.text} />
                  </div>
                  <AboutReadMore />
                </div>
              </AboutSharedElement>
            </div>
          </div>
        </AboutContinuity>
      </div>
    </section>
  )
}
