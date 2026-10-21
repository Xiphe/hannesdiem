export const redirects = new Map<string, { to: string; status: 307 | 308 }>([
  ['/', { to: '/linktree', status: 307 }],
  ['/owa', { to: '/one-week-album', status: 308 }],
  ['/one-week-album-retreat', { to: '/one-week-album', status: 308 }],
  [
    '/owa/form',
    {
      to: 'https://docs.google.com/forms/d/e/1FAIpQLSfOWkJ_24G5sPa694SbLp6jv7JmtDulCLJOwUwtGC5UcDSxJQ/viewform?usp=dialog',
      status: 307,
    },
  ],
  [
    '/owa/summer-2025',
    {
      to: 'https://e.pcloud.link/publink/show?code=kZlBJOZQvIgTgpy8TLDaBAVWSJKPmWo2jv7',
      status: 307,
    },
  ],
  [
    '/cv',
    {
      to: 'https://docs.google.com/document/d/1LEo6Z-sLCULuJikA1JjbfcQTfP6UavQyjM7DehcMZeQ/edit?usp=sharing',
      status: 307,
    },
  ],
])
