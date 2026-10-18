import { Release } from '@hannesdiem/content-components'
import { release } from './hoffnung.ts'

export const title = release.title

export default function Content() {
  return (
    <>
      <Release {...release}>
        <p>
          {
            'Ich habe schon verzweifelt gehofft – ein Gefühl, wenn alles dunkel ist, wenn alles unterzugehen scheint.'
          }
          <br />
          {
            'Im Strudel nach unten sieht diese Hoffnung kein Licht – sie ist bloß zu störrisch um aufzugeben.'
          }
        </p>
        <p>
          {'Ich habe auch verblendet gehofft.'}
          <br />
          {'"Vielleicht könnte es ja dieses Mal klappen.”'}
          <br />
          {
            'Obwohl ich nichts geändert habe, könnten die Sterne ja endlich richtig stehen für mich.'
          }
          <br />
          {'Diese Hoffnung bewegt sich nicht. Sie glaubt. Sie braucht. Aber sie gibt nicht.'}
        </p>
        <p>
          {'Die Hoffnung, die ich hier meine, hat Gewissheit.'}
          <br />
          {
            'Sie trägt ein “Ja!” in sich und gleichzeitig die Wahrheit, dass Tränen geweint werden, Wut geschrien wird und Angst erschüttert.'
          }
          <br />
          {
            'Genau wie Freude gefühlt wird wie dieser silber-bunt glitzernde Film von Kribbeln zwischen den Oberarmen und dem Rauschen der Wellen.'
          }
        </p>
        <p>
          {'Diese Hoffnung sieht.'}
          <br />
          {'Sie begründet sich selbst.'}
          <br />
          {'Sie erschafft, tanzt und spielt.'}
          <br />
          {'Sie bricht auf, sie bricht um.'}
          <br />
          {'Sie hat Geduld, verwandelt sich, treibt an und rührt auf.'}
          <br />
          {'Sie erträgt, gewährt, verzeiht, verbindet und vertraut.'}
        </p>
        <p>
          <br />
        </p>
        <p>{'Sie liebt.'}</p>
      </Release>
    </>
  )
}
