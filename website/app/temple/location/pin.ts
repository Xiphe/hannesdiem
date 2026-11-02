// Four cubic segments give the transition and the map an identical silhouette.
export const pinPoints: [number, number][] = [
  [0, -60],
  [12, -60],
  [22, -50],
  [22, -38],
  [22, -25],
  [6, -10],
  [0, 0],
  [-6, -10],
  [-22, -25],
  [-22, -38],
  [-22, -50],
  [-12, -60],
  [0, -60],
]

export function pinOutline(points: [number, number][]) {
  let path = `M${points[0].join(' ')}`
  for (let i = 1; i < points.length; i += 3)
    path +=
      'C' +
      points
        .slice(i, i + 3)
        .map((point) => point.join(' '))
        .join(' ')
  return path + 'Z'
}

export const pinPath = pinOutline(pinPoints) + 'M8 -38a8 8 0 1 0-16 0a8 8 0 1 0 16 0Z'
