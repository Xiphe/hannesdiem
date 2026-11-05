import type { Handle } from 'remix/component'

export function FeedIcon(
  handle: Handle<{
    name:
      | 'back'
      | 'share'
      | 'play'
      | 'pause'
      | 'sound'
      | 'muted'
      | 'replay'
      | 'next'
      | 'fullscreen'
      | 'exit-fullscreen'
  }>,
) {
  return () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {handle.props.name === 'back' ? (
        <path d="m14.5 5-7 7 7 7" />
      ) : handle.props.name === 'share' ? (
        <>
          <path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" />
        </>
      ) : handle.props.name === 'fullscreen' ? (
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5" />
      ) : handle.props.name === 'exit-fullscreen' ? (
        <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5" />
      ) : handle.props.name === 'play' ? (
        <path
          d="m9 5 11 7-11 7Z"
          fill="currentColor"
          stroke="none"
        />
      ) : handle.props.name === 'replay' ? (
        <path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6" />
      ) : handle.props.name === 'next' ? (
        <>
          <path
            d="m6 5 10 7-10 7Z"
            fill="currentColor"
            stroke="none"
          />
          <path d="M19 5v14" />
        </>
      ) : handle.props.name === 'pause' ? (
        <path
          d="M8 5v14m8-14v14"
          strokeWidth="4"
        />
      ) : handle.props.name === 'muted' ? (
        <path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6" />
      ) : (
        <>
          <path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </>
      )}
    </svg>
  )
}
