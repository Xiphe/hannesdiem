const mode = new URL(location.href).searchParams.get('mode')
await import(
  mode === 'layers' ? './layers.js' : mode === 'glitch' ? './glitch.js' : './specimens.js'
)
