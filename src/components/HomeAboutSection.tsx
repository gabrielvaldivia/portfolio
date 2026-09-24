import { ABOUT_BIO_HEADING } from '@/lib/aboutBio'
import { AboutBio } from '@/components/AboutBio'
import { AboutContinuity, AboutReadMore, AboutSharedElement } from '@/components/AboutContinuity'
import { SprayPaintPortrait } from '@/components/SprayPaintPortrait'

export function HomeAboutSection() {
  return (
    <section id="about" aria-labelledby="home-about-heading" className="hero-followup-snap-point mt-20 scroll-mt-8 tablet:mt-28 desktop:mt-40">
      <div className="home-page-content home-page-gutters mx-auto">
        <AboutContinuity>
          <div className="about-intro-grid home-grid items-start">
            <div className="home-grid-sidebar">
              <AboutSharedElement name="portrait">
                <div className="w-full tablet:max-w-[360px]">
                  <SprayPaintPortrait image={{ url: '/images/about-portrait.jpg', alt: 'Portrait of Gabriel Valdivia', width: 1118, height: 1342 }} />
                </div>
              </AboutSharedElement>
            </div>
            <div className="home-grid-main min-w-0">
              <AboutSharedElement name="bio">
                <div>
                  <div className="flex flex-col gap-6">
                    <h2 id="home-about-heading" className="text-balance">{ABOUT_BIO_HEADING}</h2>
                    <AboutBio />
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
