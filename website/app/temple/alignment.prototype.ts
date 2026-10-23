// LOCAL STUDY: ?variant=left compares three left-aligned lines with the accepted opener.
// Pending artist feedback. No publication or additional review chrome.
export function leftAlignmentStudy(
  width: number,
  height: number,
  rowWidths: number[],
  totalHeight: number,
  edgeToEdge: boolean,
) {
  if (new URLSearchParams(location.search).get('variant') !== 'left') return
  const left = edgeToEdge ? 0 : Math.max(16, width * 0.03)
  const scale = Math.min((width - left * 2) / Math.max(...rowWidths), (height * 0.78) / totalHeight)
  return {
    scale,
    left,
    top: (height - totalHeight * scale) / 2 - height * 0.025,
  }
}
