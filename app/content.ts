export interface PageContent {
  title: string
  paragraphs: string[]
}

export type ContentLoader = (request: Request) => Promise<PageContent>

export const loadContent: ContentLoader = async () => ({
  title: 'Hannes Diem',
  paragraphs: [
    'Music, words, and a place to share what comes next.',
    'This is placeholder content for the Remix and Cloudflare spike.',
  ],
})
