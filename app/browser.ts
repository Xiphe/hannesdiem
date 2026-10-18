import { run } from 'remix/component'

const app = run({
  async loadModule(moduleUrl, exportName) {
    const module = await import(moduleUrl)
    const component = module[exportName]
    if (typeof component !== 'function') throw new Error(`Unknown client entry: ${moduleUrl}#${exportName}`)
    return component
  },
})

app.addEventListener('error', (event) => console.error(event.error))
await app.ready()
