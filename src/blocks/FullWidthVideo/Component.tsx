type Props = {
  video?: { url: string }
  url?: string
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  controls?: boolean
}

export function FullWidthVideoBlock({ video, url, autoplay = true, loop = true, muted = true, controls = false }: Props) {
  const src = video?.url || url

  if (!src) {
    return <div className="bg-background-alt overflow-hidden aspect-video" />
  }

  return (
    <div className="bg-background-alt overflow-hidden">
      <video
        src={src}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
        className="w-full h-auto"
      />
    </div>
  )
}
