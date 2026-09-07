// Read-only check on /work/slingshot, in both themes and at desktop/mobile sizes.
(() => {
  const roots = [...document.querySelectorAll('[data-module-video-root]')]
  const customModule = roots.find(root => root.querySelector('video')?.getAttribute('src')?.includes('/slingshot-2.mp4'))
  if (!customModule) throw new Error('The Slingshot custom-background module was not rendered')
  const frame = customModule.querySelector('[data-module-video-frame]')
  if (getComputedStyle(frame).backgroundColor !== 'rgb(255, 255, 255)') {
    throw new Error('The saved custom white background should reach the module frame')
  }
  if (getComputedStyle(customModule.querySelector('video')).objectFit !== 'contain') {
    throw new Error('The module should retain its Fit setting')
  }
  for (const root of roots) {
    if (getComputedStyle(root.querySelector('.video-player-group')).backgroundColor !== 'rgba(0, 0, 0, 0)') {
      throw new Error('An inner player background is hiding the module surface')
    }
  }
  return { passed: roots.length + 2, width: innerWidth, theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
})()
