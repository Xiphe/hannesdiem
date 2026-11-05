import type { OpeningProps } from './types.ts'

export function sectionTarget(section: NonNullable<OpeningProps['section']>) {
  return section === 'visit' ? 'facts' : section
}

/** Resolve a path destination after fonts and native fact layouts have settled. */
export function mountSectionArrival(host: HTMLElement, props: OpeningProps, signal: AbortSignal) {
  const verse =
    props.view === 'poem'
      ? new URL(location.href).searchParams.get('verse')?.trim().toLowerCase()
      : undefined
  const poemTargets: Record<string, string> = {
    'im in love': `${props.id}-pair-1`,
    'im in grief': `${props.id}-pair-2`,
    'i resist': `${props.id}-pair-3`,
    'i stay': `${props.id}-bridge`,
    'i devote': `${props.id}-final-verse`,
  }
  const id = props.section ? sectionTarget(props.section) : verse ? poemTargets[verse] : undefined
  if (!id || signal.aborted) return
  // Native history restores the visitor's overview position, including feed return.
  if (
    (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type ===
    'back_forward'
  )
    return
  let done = false
  const arrive = () => {
    if (done || !['ready', 'fallback'].includes(host.dataset.state ?? '') || signal.aborted) return
    done = true
    observer.disconnect()
    if (location.hash) return
    const target = document.getElementById(id)
    target?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  const observer = new MutationObserver(arrive)
  observer.observe(host, { attributes: true, attributeFilter: ['data-state'] })
  signal.addEventListener('abort', () => observer.disconnect(), { once: true })
  arrive()
}
