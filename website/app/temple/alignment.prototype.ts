// LOCAL STUDY: ?variant=left or center compares larger stacks with the accepted opener.
// Pending artist feedback. No publication or additional review chrome.
export function alignmentStudy(
  width: number,
  height: number,
  rowWidths: number[],
  totalHeight: number,
  edgeToEdge: boolean,
) {
  const variant = new URLSearchParams(location.search).get('variant')
  if (variant !== 'left' && variant !== 'center') return
  const left = edgeToEdge ? 0 : Math.max(16, width * 0.03)
  const scale = Math.min((width - left * 2) / Math.max(...rowWidths), (height * 0.78) / totalHeight)
  return {
    scale,
    left,
    rowLefts: rowWidths.map((widthOfRow) =>
      variant === 'center' ? (width - widthOfRow * scale) / 2 : left,
    ),
    top: (height - totalHeight * scale) / 2 - height * 0.025,
  }
}
