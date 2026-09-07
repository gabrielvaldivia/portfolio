// Register with agent-browser --init-script before opening the homepage.
// Observe the first frames, not just the settled state after hydration.
(() => {
  const report = { cursor: [], menu: [], complete: false }
  window.__initialUIVisibility = report
  window.__assertInitialUIHidden = () => {
    if (!report.complete) throw new Error('Initial-frame recording is still running')
    for (const name of ['cursor', 'menu']) {
      if (!report[name].length) throw new Error(`${name} never mounted`)
      if (report[name].some(({ opacity }) => opacity !== 0)) {
        throw new Error(`${name} flashed before any interaction`)
      }
    }
    return { passed: 2, cursorSamples: report.cursor.length, menuSamples: report.menu.length }
  }
  const firstSeen = new Map()
  let frame = 0
  let stopped = false
  let animationFrame

  function sample() {
    for (const [name, selector] of [
      ['cursor', '.hero-case-study-cursor'],
      ['menu', 'nav.tablet\\:block button.rounded-full'],
    ]) {
      const element = document.querySelector(selector)
      if (!element) continue
      if (!firstSeen.has(name)) firstSeen.set(name, frame)
      if (frame - firstSeen.get(name) > 30) continue
      const style = getComputedStyle(element)
      report[name].push({
        frame,
        opacity: Number(style.opacity),
        transform: style.transform,
      })
    }
  }

  const observer = new MutationObserver(sample)
  observer.observe(document, { childList: true, subtree: true })
  function tick() {
    if (stopped) return
    frame++
    sample()
    animationFrame = requestAnimationFrame(tick)
  }
  animationFrame = requestAnimationFrame(tick)

  function stop() {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(animationFrame)
    observer.disconnect()
    report.complete = true
  }
  window.addEventListener('load', () => setTimeout(stop, 2000), { once: true })
  setTimeout(stop, 15000)
})()
