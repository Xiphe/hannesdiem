// A deliberately small inline syntax for authored bridge strings. No HTML is
// interpreted: unmatched stars stay literal, and backslashes escape stars.
export type BridgeTextRun = { text: string; bold: boolean; italic: boolean }
type Node = string | { marker: number; children: Node[] }
export function parseBridgeText(source: string): BridgeTextRun[] {
  const root: Node[] = []
  const stack = [{ marker: 0, children: root }]
  const append = (text: string) => {
    const children = stack[stack.length - 1].children
    const last = children[children.length - 1]
    if (typeof last === 'string') children[children.length - 1] = last + text
    else children.push(text)
  }
  for (let i = 0; i < source.length;) {
    if (source[i] === '\\' && /[\\*]/.test(source[i + 1] ?? '')) {
      append(source[i + 1])
      i += 2
      continue
    }
    if (source[i] !== '*') {
      append(source[i++])
      continue
    }
    let end = i
    while (source[end] === '*') end++
    let count = end - i
    const closes = i > 0 && !/\s/.test(source[i - 1])
    const opens = end < source.length && !/\s/.test(source[end])
    while (closes && stack.length > 1 && count >= stack[stack.length - 1].marker) {
      const node = stack.pop()!
      stack[stack.length - 1].children.push(node)
      count -= node.marker
    }
    while (opens && count > 0) {
      const marker = count >= 2 ? 2 : 1
      stack.push({ marker, children: [] })
      count -= marker
    }
    if (count) append('*'.repeat(count))
    i = end
  }
  // An unfinished edit must never hide its text or silently swallow stars.
  while (stack.length > 1) {
    const node = stack.pop()!
    stack[stack.length - 1].children.push('*'.repeat(node.marker), ...node.children)
  }
  const runs: BridgeTextRun[] = []
  const flatten = (nodes: Node[], bold = false, italic = false) => {
    for (const node of nodes) {
      if (typeof node !== 'string') {
        flatten(node.children, bold || node.marker === 2, italic || node.marker === 1)
        continue
      }
      const last = runs[runs.length - 1]
      if (last && last.bold === bold && last.italic === italic) last.text += node
      else runs.push({ text: node, bold, italic })
    }
  }
  flatten(root)
  return runs
}
export function bridgeText(source: string) {
  return parseBridgeText(source).map((run) =>
    run.bold ? (
      <strong>{run.italic ? <em>{run.text}</em> : run.text}</strong>
    ) : run.italic ? (
      <em>{run.text}</em>
    ) : (
      run.text
    ),
  )
}
