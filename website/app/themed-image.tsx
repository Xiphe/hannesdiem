import type { Handle, Props } from 'remix/component'

// Select outside the SVG: older iOS WebKit ignores media queries inside images.
export function ThemedImage(handle: Handle<Props<'img'> & { darkSrc: string }>) {
  return () => {
    const { darkSrc, ...image } = handle.props
    return (
      <picture style={{ display: 'contents' }}>
        <source
          media="(prefers-color-scheme: dark)"
          srcSet={darkSrc}
        />
        <img {...image} />
      </picture>
    )
  }
}
