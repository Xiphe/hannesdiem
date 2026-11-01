// Logical text offsets let pagination clone native strong/em markup, including
// emphasis that crosses a line or page boundary, without parsing HTML strings.
export function bridgeTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  return nodes
}
export function bridgeTextRange(root: HTMLElement) {
  let offset = 0
  const nodes = bridgeTextNodes(root).map((node) => {
    const start = offset
    offset += node.length
    return { node, start, end: offset }
  })
  const point = (at: number) => {
    const item = nodes.find((item) => at <= item.end) ?? nodes[nodes.length - 1]
    return { node: item.node, offset: Math.min(item.node.length, Math.max(0, at - item.start)) }
  }
  return (start: number, end: number) => {
    const from = point(start),
      to = point(end),
      range = document.createRange()
    range.setStart(from.node, from.offset)
    range.setEnd(to.node, to.offset)
    return range
  }
}
