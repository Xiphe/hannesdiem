import type { Handle } from 'remix/component'
import type { StreamVideoProps } from '@hannesdiem/content-components'

export function StreamVideo(handle: Handle<StreamVideoProps>) {
  return () => {
    const { customerCode, videoId, title, aspectRatio = 16 / 9 } = handle.props
    if (!/^[a-z0-9-]+$/i.test(customerCode)) throw new Error('Invalid Stream customer code')
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0)
      throw new Error('Stream video aspect ratio must be positive')

    return (
      <div style={{ position: 'relative', aspectRatio }}>
        <iframe
          title={title}
          src={`https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(videoId)}/iframe?preload=none`}
          loading="lazy"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    )
  }
}
