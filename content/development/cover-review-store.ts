import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'

export type CoverChoice = {
  time: number
  focalX: number
  focalY: number
  videoId: string
  frame: string
}

/** Local review drafts only; publication still consumes authored CMX cover imports. */
export async function coverReviewStore(directory: string) {
  await mkdir(directory, { recursive: true })
  const path = `${directory}/selections.json`
  let choices: Record<string, CoverChoice> = {}
  try {
    choices = JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  let saving = Promise.resolve()
  return {
    get(id: string) {
      return Object.hasOwn(choices, id) ? structuredClone(choices[id]) : undefined
    },
    save(id: string, selection: Omit<CoverChoice, 'frame'>, bytes: Uint8Array) {
      const save = saving.then(async () => {
        if (!/^[a-z0-9-]+$/i.test(id)) throw new Error('Invalid cover identity')
        const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
        const choice = { ...selection, frame: `${id}-${digest}.jpg` }
        await writeFile(`${directory}/${choice.frame}`, bytes)
        const next = { ...choices, [id]: choice }
        await writeFile(`${path}.tmp`, JSON.stringify(next, null, 2) + '\n')
        await rename(`${path}.tmp`, path)
        choices = next
        return structuredClone(choice)
      })
      saving = save.then(
        () => {},
        () => {},
      )
      return save
    },
  }
}
