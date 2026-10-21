import { appendFile } from 'node:fs/promises'
import {
  CMX_DOCUMENT_SCHEMA,
  verifyCmxDocumentEnvironment,
  type CmxDocument,
  type CmxDependency,
} from '@cmx-tools/contracts'
import { environment } from '../.cmx/environment.ts'

const origin = process.env.SITE_URL
if (!origin) throw new Error('SITE_URL is required.')
const response = await fetch(new URL('/_cmx/status', origin), {
  cache: 'no-store',
  redirect: 'error',
  signal: AbortSignal.timeout(20_000),
})
let bootstrap: boolean
if (response.status === 404)
  bootstrap = true // Existing bundled-content website.
else {
  if (!response.ok) throw new Error(`Cannot check content host (${response.status}).`)
  const status = (await response.json()) as {
    ready?: boolean
    versions: CmxDocument['cmxVersion'][]
    dependencies: CmxDependency[]
    components: { from: string; name: string }[]
  }
  if (typeof status.ready !== 'boolean') throw new Error('Invalid content host status.')
  if (status.ready) {
    for (const version of status.versions) {
      const document: CmxDocument = {
        $schema: CMX_DOCUMENT_SCHEMA,
        cmxVersion: version,
        interface: {
          imports: Object.fromEntries(
            status.dependencies.map((dependency, i) => [String(i), dependency]),
          ),
          exports: {},
        },
        content: {},
      }
      if (!verifyCmxDocumentEnvironment(document, environment).valid)
        throw new Error(
          'Website deployment would reject currently published content. Stage a compatible implementation first.',
        )
    }
    for (const component of status.components) {
      if (
        !Object.hasOwn(environment.imports, component.from) ||
        !Object.hasOwn(environment.imports[component.from], component.name)
      ) {
        throw new Error('Website deployment would remove a component used by published content.')
      }
    }
  }
  bootstrap = !status.ready
}
if (process.env.GITHUB_OUTPUT)
  await appendFile(process.env.GITHUB_OUTPUT, `required=${bootstrap}\n`)
console.log(
  bootstrap
    ? 'Initial deployment will retain a content fallback until publication.'
    : 'Persistent content is initialized; no content will be bundled.',
)
