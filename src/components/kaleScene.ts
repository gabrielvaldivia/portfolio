import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { SVGLoader, type SVGResult } from 'three/examples/jsm/loaders/SVGLoader.js'

// Geometry and finishes follow the Kale website's tablet viewer (units are millimetres).
// The GLB holds only the case, using its closed "plain" covers (the stand-pocket covers are
// stripped); the tablet, bezel and screen are built here.

export const KALE_MODEL_URL = '/models/kale-case.glb'
const KALE_LOGO_URL = '/models/kale-logo.svg'

export const KALE_CASE_COLORS = {
  chalk: '#f2ebe7',
  periwinkle: '#cbd3eb',
  sage: '#afbea5',
} as const

export type KaleCaseColor = keyof typeof KALE_CASE_COLORS

const CAP_COLOR = '#ff6a39'
const INTERNAL_COLOR = '#88877e'
const VIDEO_TIMEOUT_MS = 20000
const SCREEN_WIDTH = 234
const SCREEN_HEIGHT = 146
const REST_YAW = 0
const REST_PITCH = 0
const MAX_PITCH = 0.6
// Idle sway: about 10 degrees from side to side, one full cycle every 16 seconds.
const SWAY_AMPLITUDE = THREE.MathUtils.degToRad(5)
const SWAY_PERIOD_MS = 16000
// A throw keeps spinning, losing this share of its speed each millisecond (about 92% per second).
const SPIN_FRICTION = 0.9975
const MAX_SPIN = 0.04 // radians per millisecond
// After a drag it waits this long before settling, or briefly once the mouse has left.
const SETTLE_DELAY_MS = 2400
const SETTLE_DELAY_AFTER_LEAVE_MS = 300
// Hovering tilts the tablet toward the pointer by up to this much.
const HOVER_YAW = THREE.MathUtils.degToRad(8)
const HOVER_PITCH = THREE.MathUtils.degToRad(5)

type SceneOptions = {
  container: HTMLElement
  media: { src: string; isVideo: boolean }
  caseColor: KaleCaseColor
  reducedMotion: boolean
  onReady: () => void
  onError: (error: unknown) => void
}

function roundedRect(width: number, height: number, radius: number) {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}

function addTablet(parent: THREE.Object3D, screenTexture: THREE.Texture) {
  const glass = new THREE.MeshStandardMaterial({ color: '#111513', roughness: 0.31, metalness: 0.15 })
  const aluminium = new THREE.MeshStandardMaterial({ color: '#777b80', roughness: 0.36, metalness: 0.72 })
  const lens = new THREE.MeshPhysicalMaterial({ color: '#122025', roughness: 0.16, metalness: 0.3, clearcoat: 1 })

  const chassis = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(255.2, 166.4, 8.5), {
      depth: 7.45,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.35,
      bevelSegments: 3,
      curveSegments: 20,
    }),
    aluminium,
  )
  chassis.position.set(0, 120.5, -9.8)

  const gasket = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(251, 165, 8), { depth: 0.5, bevelEnabled: false, curveSegments: 32 }),
    glass,
  )
  gasket.position.set(0, 120.5, -2.1)

  const bezelShape = roundedRect(249.5, 166, 8)
  bezelShape.holes.push(roundedRect(SCREEN_WIDTH, SCREEN_HEIGHT, 2.5))
  const bezel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bezelShape, { depth: 0.85, bevelEnabled: false, curveSegments: 32 }),
    glass,
  )
  bezel.position.set(0, 120.3, -1.8)

  const screenGeometry = new THREE.ShapeGeometry(roundedRect(SCREEN_WIDTH, SCREEN_HEIGHT, 2.5), 20)
  const positions = screenGeometry.attributes.position.array
  const uvs: number[] = []
  for (let i = 0; i < positions.length; i += 3) {
    uvs.push(positions[i] / SCREEN_WIDTH + 0.5, positions[i + 1] / SCREEN_HEIGHT + 0.5)
  }
  screenGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  const screen = new THREE.Mesh(screenGeometry, new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }))
  screen.position.set(0, 120.3, -0.75)

  const frontCamera = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), lens)
  frontCamera.position.set(0, 197.3, -0.45)

  const rearCamera = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.7, 3.9, 64), aluminium)
  rearCamera.rotation.x = Math.PI / 2
  rearCamera.position.set(-110.325, 186.975, -11.35)

  for (const mesh of [chassis, gasket, bezel, rearCamera]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
  parent.add(chassis, gasket, bezel, screen, frontCamera, rearCamera)
}

// The sliding privacy cover over the rear camera, left open so the lens shows.
function addCameraCover(parent: THREE.Object3D, caseMaterial: THREE.Material) {
  const cover = new THREE.Group()
  cover.position.set(-110.325 + 11.5, 186.975, -13.36)
  cover.rotation.y = Math.PI

  const trim = new THREE.MeshPhysicalMaterial({ color: '#e7e8e6', metalness: 1, roughness: 0.38 })
  const backing = new THREE.MeshStandardMaterial({ color: '#7e807d', metalness: 0.2, roughness: 0.6 })
  const lensHole = () => new THREE.Path().absarc(11.5, 0, 7.4, 0, Math.PI * 2, true)

  const layer = (width: number, height: number, depth: number, material: THREE.Material, z: number, rim = false) => {
    const shape = roundedRect(width, height, height / 2)
    shape.holes.push(rim ? roundedRect(width - 1.4, height - 1.4, (height - 1.4) / 2) : lensHole())
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 }), material)
    mesh.position.z = z
    mesh.castShadow = true
    mesh.receiveShadow = true
    cover.add(mesh)
  }
  layer(43, 20.5, 0.16, backing, 0)
  layer(42, 19.5, 0.25, trim, 0.16)
  layer(42, 19.5, 0.35, trim, 0.4, true)

  const lensRing = new THREE.Mesh(new THREE.RingGeometry(6.1, 7.4, 64), trim)
  lensRing.position.set(11.5, 0, 0.43)

  const slider = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(26, 18, 9), {
      depth: 0.65,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.22,
      bevelSegments: 3,
      curveSegments: 32,
    }),
    caseMaterial,
  )
  slider.position.set(-7.8, 0, 0.7)
  slider.castShadow = true
  slider.receiveShadow = true

  cover.add(lensRing, slider)
  parent.add(cover)
}

function disc(radius: number, hole: number, depth: number) {
  const shape = new THREE.Shape().absarc(0, 0, radius, 0, Math.PI * 2, false)
  if (hole) shape.holes.push(new THREE.Path().absarc(0, 0, hole, 0, Math.PI * 2, true))
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 })
}

// Matching threaded end caps for both ends of the tube, each with a screwdriver slot.
function addEndCaps(parent: THREE.Object3D, caseMaterial: THREE.Material, capMaterial: THREE.Material) {
  for (const side of [-1, 1]) {
    const cap = new THREE.Group()
    cap.position.set(side * 130.6, 20.75, -20.75)
    cap.rotation.y = (side * Math.PI) / 2

    const lip = new THREE.Mesh(disc(15.05, 14.15, 0.8), caseMaterial)
    lip.position.z = -0.3
    const receiver = new THREE.Mesh(disc(15.02, 14.02, 9), caseMaterial)
    receiver.position.z = -9
    const stem = new THREE.Mesh(disc(12.8, 0, 8.1), capMaterial)
    stem.position.z = -8.1
    const slotFloor = new THREE.Mesh(disc(13.55, 0, 0.35), capMaterial)
    slotFloor.position.z = 0.1

    const face = new THREE.Shape().absarc(0, 0, 13.65, 0, Math.PI * 2, false)
    const slot = new THREE.Path()
    slot.moveTo(-0.45, -9.55)
    slot.lineTo(-0.45, 9.55)
    slot.absarc(0, 9.55, 0.45, Math.PI, 0, true)
    slot.lineTo(0.45, -9.55)
    slot.absarc(0, -9.55, 0.45, 0, -Math.PI, true)
    slot.closePath()
    face.holes.push(slot)
    const faceMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(face, {
        depth: 1.05,
        bevelEnabled: true,
        bevelThickness: 0.3,
        bevelSize: 0.35,
        bevelSegments: 4,
        curveSegments: 64,
      }),
      capMaterial,
    )
    faceMesh.position.z = 0.75

    for (const mesh of [lip, receiver, stem, slotFloor, faceMesh]) {
      mesh.castShadow = true
      mesh.receiveShadow = true
      cap.add(mesh)
    }
    parent.add(cap)
  }
}

// The Kale wordmark on the back, sized and placed like the website's recessed logo.
// A slightly darker inlay stands in for the recess so the cover needs no runtime cut.
function addRearLogo(parent: THREE.Object3D, svg: SVGResult, caseColor: string) {
  const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path))
  const geometry = new THREE.ShapeGeometry(shapes, 32)
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  // Fit within 152 x 72mm, then scale to 60% as the website does by default.
  const scale = Math.min(152 / size.x, 72 / size.y) * 0.6
  geometry.translate(-center.x, -center.y, 0)

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(caseColor).multiplyScalar(0.86),
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
  const logo = new THREE.Mesh(geometry, material)
  // SVG y points down, so flip it; turning to face the back keeps the text reading left to right.
  logo.scale.set(scale, -scale, 1)
  logo.rotation.y = Math.PI
  logo.position.set(0, 107, -13.72)
  logo.receiveShadow = true
  parent.add(logo)
}

// Crops the media to the screen the way `object-fit: cover` would.
function coverTexture(texture: THREE.Texture, width: number, height: number) {
  if (!width || !height) return
  const screenAspect = SCREEN_WIDTH / SCREEN_HEIGHT
  const mediaAspect = width / height
  texture.repeat.set(1, 1)
  texture.offset.set(0, 0)
  if (mediaAspect > screenAspect) {
    texture.repeat.x = screenAspect / mediaAspect
    texture.offset.x = (1 - texture.repeat.x) / 2
  } else {
    texture.repeat.y = mediaAspect / screenAspect
    texture.offset.y = (1 - texture.repeat.y) / 2
  }
}

// The same media often appears elsewhere on the page as a plain <img>/<video>, which the browser
// caches without CORS headers. A separate cache key keeps WebGL from reusing that copy.
function textureUrl(src: string) {
  const url = new URL(src, window.location.href)
  if (url.origin === window.location.origin) return url.href
  url.searchParams.set('kale-texture', '1')
  return url.href
}

function loadScreenTexture(media: SceneOptions['media']) {
  const src = textureUrl(media.src)
  if (media.isVideo) {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.loop = true
    // iOS only autoplays inline video that is muted by attribute, and loads no data until
    // playback starts, so start playing straight away instead of waiting for data.
    video.muted = true
    video.defaultMuted = true
    video.playsInline = true
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.preload = 'auto'
    video.src = src
    return new Promise<{ texture: THREE.VideoTexture; video: HTMLVideoElement }>((resolve, reject) => {
      let settled = false
      const timeout = window.setTimeout(() => fail(new Error(`Timed out loading ${media.src}`)), VIDEO_TIMEOUT_MS)
      const ready = () => {
        if (settled || !video.videoWidth) return
        settled = true
        window.clearTimeout(timeout)
        const texture = new THREE.VideoTexture(video)
        texture.colorSpace = THREE.SRGBColorSpace
        coverTexture(texture, video.videoWidth, video.videoHeight)
        resolve({ texture, video })
      }
      function fail(error: Error) {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        video.removeAttribute('src')
        video.load()
        reject(error)
      }
      for (const event of ['loadeddata', 'canplay', 'playing']) video.addEventListener(event, ready)
      video.addEventListener('error', () => fail(new Error(`Could not load ${media.src}`)), { once: true })
      video.play().catch(() => {})
    })
  }

  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  return loader.loadAsync(src).then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    const image = texture.image as HTMLImageElement
    coverTexture(texture, image.naturalWidth, image.naturalHeight)
    return { texture, video: null }
  })
}

// Every Kale block on a page shares one download and decode of the model and logo; each
// scene clones the model, sharing its geometry.
let sharedAssets: Promise<{ model: THREE.Group; logo: SVGResult }> | null = null
function loadSharedAssets() {
  if (!sharedAssets) {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    sharedAssets = Promise.all([loader.loadAsync(KALE_MODEL_URL), new SVGLoader().loadAsync(KALE_LOGO_URL)])
      .then(([gltf, logo]) => {
        gltf.scene.traverse((object) => { object.userData.sharedGeometry = true })
        return { model: gltf.scene, logo }
      })
      .catch((error) => {
        sharedAssets = null
        throw error
      })
  }
  return sharedAssets
}

// Phones and small screens get a lighter render: fewer pixels and a smaller shadow map.
function isCompactDevice() {
  return window.matchMedia('(max-width: 809px), (pointer: coarse)').matches
}

export function createKaleScene({ container, media, caseColor, reducedMotion, onReady, onError }: SceneOptions) {
  let disposed = false
  let frame = 0
  let visible = true
  let video: HTMLVideoElement | null = null

  const compact = isCompactDevice()
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.touchAction = 'pan-y'
  renderer.domElement.style.cursor = 'grab'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = environment
  scene.environmentIntensity = 0.55

  const camera = new THREE.PerspectiveCamera(26, 1, 10, 4000)

  const key = new THREE.DirectionalLight('#ffffff', 2.1)
  key.position.set(-180, 420, 520)
  key.castShadow = true
  key.shadow.mapSize.set(compact ? 512 : 1024, compact ? 512 : 1024)
  key.shadow.camera.left = -260
  key.shadow.camera.right = 260
  key.shadow.camera.top = 260
  key.shadow.camera.bottom = -260
  key.shadow.radius = 6
  key.shadow.bias = -0.0005
  scene.add(key, new THREE.HemisphereLight('#ffffff', '#d9d4cf', 0.9))

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.12 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -128
  floor.receiveShadow = true
  scene.add(floor)

  // Pivot sits at the centre of the case so drags spin it in place.
  const pivot = new THREE.Group()
  pivot.rotation.set(REST_PITCH, REST_YAW, 0)
  scene.add(pivot)

  const caseMaterial = new THREE.MeshPhysicalMaterial({ color: KALE_CASE_COLORS[caseColor], roughness: 0.62, clearcoat: 0.08 })
  const capMaterial = new THREE.MeshPhysicalMaterial({ color: CAP_COLOR, roughness: 0.48 })
  const internalMaterial = new THREE.MeshStandardMaterial({ color: INTERNAL_COLOR, roughness: 0.7 })
  const caseMeshes = new Set(['plain-main-cover', 'plain-back-cover', 'back-internal-cover'])

  const fitCamera = () => {
    const { width, height } = container.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Keep the whole case (about 300mm across once turned) in frame at any aspect ratio.
    // Phones have no sway or hover tilt to leave room for, so the case fills more of the stage.
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const fitHeight = (compact ? 240 : 290) / (2 * Math.tan(halfFov))
    const fitWidth = (compact ? 290 : 350) / (2 * Math.tan(halfFov) * camera.aspect)
    camera.position.set(0, 18, Math.max(fitHeight, fitWidth))
    camera.lookAt(0, -6, 0)
    camera.updateProjectionMatrix()
    requestRender()
  }

  // Drag spins the case; when idle it eases back to head-on and, except on phones, sways gently.
  const target = { yaw: REST_YAW, pitch: REST_PITCH }
  const velocity = { yaw: 0 } // radians per millisecond
  let drag: { x: number; y: number; yaw: number; pitch: number; id: number } | null = null
  // Recent drag positions, used to measure how fast it was thrown.
  let dragSamples: { time: number; yaw: number }[] = []
  let mouseOutside = false
  let lastTick = 0
  let lastInteraction = 0
  // When the current sway began, so each sway starts from head-on rather than mid-swing.
  let swayStart: number | null = null
  // Mouse position over the stage, from -1 to 1 on each axis.
  let hover: { x: number; y: number } | null = null

  const onPointerDown = (event: PointerEvent) => {
    drag = { x: event.clientX, y: event.clientY, yaw: target.yaw, pitch: target.pitch, id: event.pointerId }
    dragSamples = [{ time: performance.now(), yaw: target.yaw }]
    velocity.yaw = 0
    mouseOutside = false
    swayStart = null
    renderer.domElement.setPointerCapture(event.pointerId)
    renderer.domElement.style.cursor = 'grabbing'
    requestRender()
  }
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') mouseOutside = false
    if (!drag && event.pointerType === 'mouse' && !reducedMotion && !compact) {
      const rect = container.getBoundingClientRect()
      hover = {
        x: THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
        y: THREE.MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
      }
      requestRender()
    }
    if (!drag || event.pointerId !== drag.id) return
    const width = container.clientWidth || 1
    target.yaw = drag.yaw + ((event.clientX - drag.x) / width) * Math.PI * 2
    target.pitch = THREE.MathUtils.clamp(drag.pitch + ((event.clientY - drag.y) / width) * Math.PI, -MAX_PITCH, MAX_PITCH)
    const sampledAt = performance.now()
    dragSamples.push({ time: sampledAt, yaw: target.yaw })
    // Keep ~100ms of samples, but always at least two so slow devices still measure a speed.
    while (dragSamples.length > 2 && sampledAt - dragSamples[1].time > 100) dragSamples.shift()
    lastInteraction = performance.now()
    requestRender()
  }
  const onPointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return
    drag = null
    // Throw speed over the last ~100ms, unless the pointer had come to rest before letting go.
    const first = dragSamples[0]
    const last = dragSamples[dragSamples.length - 1]
    const elapsed = last && first ? last.time - first.time : 0
    velocity.yaw = !reducedMotion && elapsed > 0 && performance.now() - last.time < 60
      ? THREE.MathUtils.clamp((last.yaw - first.yaw) / elapsed, -MAX_SPIN, MAX_SPIN)
      : 0
    dragSamples = []
    lastInteraction = performance.now()
    renderer.domElement.style.cursor = 'grab'
    requestRender()
  }
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') mouseOutside = true
    hover = null
    swayStart = null
    requestRender()
  }
  const onDoubleClick = () => {
    target.yaw = REST_YAW
    target.pitch = REST_PITCH
    velocity.yaw = 0
    lastInteraction = 0
    swayStart = null
    requestRender()
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerUp)
  renderer.domElement.addEventListener('pointerleave', onPointerLeave)
  renderer.domElement.addEventListener('dblclick', onDoubleClick)

  const tick = () => {
    frame = 0
    if (disposed) return
    const now = performance.now()
    const dt = lastTick ? Math.min(now - lastTick, 50) : 16
    lastTick = now
    let settling = false

    if (!drag) {
      if (Math.abs(velocity.yaw) > 0.0003) {
        target.yaw += velocity.yaw * dt
        velocity.yaw *= Math.pow(SPIN_FRICTION, dt)
        lastInteraction = now
        swayStart = null
        settling = true
      } else if (now - lastInteraction > (mouseOutside ? SETTLE_DELAY_AFTER_LEAVE_MS : SETTLE_DELAY_MS)) {
        // Unwind any full turns from dragging so it comes back the short way round.
        const turns = Math.round((target.yaw - REST_YAW) / (Math.PI * 2))
        if (turns) {
          target.yaw -= turns * Math.PI * 2
          pivot.rotation.y -= turns * Math.PI * 2
        }
        // Hovering turns it toward the pointer; otherwise it sways, starting from head-on.
        let restYaw = REST_YAW
        let restPitch = REST_PITCH
        if (hover) {
          restYaw += hover.x * HOVER_YAW
          restPitch += hover.y * HOVER_PITCH
        } else if (!reducedMotion && !compact) {
          swayStart ??= now
          restYaw += SWAY_AMPLITUDE * Math.sin(((now - swayStart) / SWAY_PERIOD_MS) * Math.PI * 2)
        }
        target.yaw += (restYaw - target.yaw) * 0.04
        target.pitch += (restPitch - target.pitch) * 0.04
        // Without the sway, stop drawing once it has settled.
        if ((reducedMotion || compact) && !hover && Math.abs(restYaw - target.yaw) < 0.001 && Math.abs(restPitch - target.pitch) < 0.001) {
          target.yaw = REST_YAW
          target.pitch = REST_PITCH
        } else settling = true
      } else settling = true
    }

    const ease = reducedMotion || drag ? 1 : 0.18
    pivot.rotation.y += (target.yaw - pivot.rotation.y) * ease
    pivot.rotation.x += (target.pitch - pivot.rotation.x) * ease
    const moving = Math.abs(target.yaw - pivot.rotation.y) > 0.0005 || Math.abs(target.pitch - pivot.rotation.x) > 0.0005

    renderer.render(scene, camera)
    if (visible && (drag || settling || moving || (video && !video.paused))) requestRender()
  }

  function requestRender() {
    if (!frame && !disposed) frame = requestAnimationFrame(tick)
  }

  const resizeObserver = new ResizeObserver(fitCamera)
  resizeObserver.observe(container)

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (video) {
      if (visible && !reducedMotion) video.play().catch(() => {})
      else video.pause()
    }
    if (visible) requestRender()
  }, { threshold: 0.1 })
  visibilityObserver.observe(container)

  Promise.all([loadSharedAssets(), loadScreenTexture(media)])
    .then(([{ model: sharedModel, logo }, screen]) => {
      if (disposed) {
        screen.texture.dispose()
        screen.video?.pause()
        return
      }
      const model = sharedModel.clone(true)
      model.position.set(0, -104, 13)
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.material = caseMeshes.has(object.name) ? caseMaterial : internalMaterial
        object.castShadow = !object.name.includes('internal')
        object.receiveShadow = true
      })
      screen.texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
      addTablet(model, screen.texture)
      addCameraCover(model, caseMaterial)
      addEndCaps(model, caseMaterial, capMaterial)
      addRearLogo(model, logo, KALE_CASE_COLORS[caseColor])
      pivot.add(model)

      video = screen.video
      if (video && visible && !reducedMotion) video.play().catch(() => {})
      swayStart = null
      fitCamera()
      requestRender()
      onReady()
    })
    .catch((error) => {
      if (!disposed) onError(error)
    })

  return () => {
    disposed = true
    if (frame) cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    visibilityObserver.disconnect()
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
    renderer.domElement.removeEventListener('pointercancel', onPointerUp)
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
    renderer.domElement.removeEventListener('dblclick', onDoubleClick)
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      // Geometry shared with other Kale blocks on the page stays loaded.
      if (!object.userData.sharedGeometry) object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose()
        material.dispose()
      })
    })
    environment.dispose()
    pmrem.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
