import { execFileSync } from 'node:child_process'
import { appendFile } from 'node:fs/promises'

export function releaseChanges(paths: string[]) {
  let website = false,
    content = false
  for (const path of paths) {
    if (/^(?:docs\/|\.agents\/)|\.md$/.test(path)) continue
    if (path.startsWith('content/') && !path.startsWith('content/contract/')) {
      content = true
      continue
    }
    if (
      /^scripts\/(?:build-media|build-og|extract-palettes|upload-media|compile-cmx|build-routes|build-publication|publish-transport)\.ts$/.test(
        path,
      ) ||
      path.startsWith('tools/palette/') ||
      path === '.github/workflows/content.yml' ||
      path.startsWith('.github/actions/prepare-content/')
    ) {
      content = true
      continue
    }
    if (
      path.startsWith('app/') ||
      path === 'scripts/build.ts' ||
      path === 'scripts/build-dev.ts' ||
      path === 'wrangler.jsonc'
    ) {
      website = true
      continue
    }
    website = true
    content = true
  }
  return { website, content }
}

if (import.meta.main) {
  const repository = process.env.GITHUB_REPOSITORY
  const sha = process.env.GITHUB_SHA
  const token = process.env.GH_TOKEN
  if (!repository || !sha || !token)
    throw new Error('Release planning requires GitHub Actions context.')
  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/deploy.yml/runs?branch=main&event=push&status=success&per_page=1`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    },
  )
  if (!response.ok)
    throw new Error(`Cannot determine last successful release (${response.status}).`)
  const data = (await response.json()) as { workflow_runs: { head_sha: string }[] }
  const base = data.workflow_runs[0]?.head_sha
  // Compare with the last successful release, not just the preceding push: GitHub
  // can supersede pending runs, and failed releases must be retried cumulatively.
  const paths = base
    ? execFileSync('git', ['diff', '--name-only', base, sha], { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(Boolean)
    : []
  const changes = base ? releaseChanges(paths) : { website: true, content: true }
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `website=${changes.website}\ncontent=${changes.content}\n`,
    )
  console.log(JSON.stringify({ base: base ?? null, sha, ...changes }))
}
