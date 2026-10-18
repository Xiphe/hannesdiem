import { Release } from '@hannesdiem/content-components'
import { release } from './unbeschrieben.ts'

export const title = release.title

export default function Content() {
  return (
    <>
      <Release {...release}>
        <p>
          {
            'Ein Erstlingswerk. Ein Blatt Papier mit vielen Abdrücken und nur einigen Strichen. Ein Wesen, das bisher nicht gesehen, gehört und verstanden ist. Ein Gedanke, der vielleicht niemals gedacht wird.'
          }
        </p>
        <p>
          {
            'Die Band Kaleidos Chaos hat sich leider während der Produktion dieses Albums getrennt. Wir sind dennoch unsagbar stolz und glücklich, diese Lieder verewigt zu haben und hoffen, dass sie euch genau so sehr gefallen wie uns.'
          }
        </p>
        <p>
          <strong>{'Danke für die wunderbare Zeit!'}</strong>
        </p>
      </Release>
    </>
  )
}
