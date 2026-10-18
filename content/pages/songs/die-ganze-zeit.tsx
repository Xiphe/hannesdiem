import { Song } from '@hannesdiem/content-components'
import { songs } from '../../songs.ts'

const { slug, ...song } = songs.dieGanzeZeit

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...song}>
        <p>
          {"Ich wünsch' dir, dass du jemanden triffst"}
          <br />
          {'Der dir die Welt zu Füßen legt,'}
          <br />
          {'Der für dich kämpft und der dich schützt'}
          <br />
          {'Der dich küsst im Blütenbeet'}
          <br />
          {'Eine Person, die dich so glücklich macht,'}
          <br />
          {'Dass alles leise wird und plötzlich passt'}
          <br />
          {'Die den Schmerz dir nimmt'}
          <br />
          {'Und herzlich mit dir lacht'}
        </p>
        <p>
          {"Ich wünsch' dir, dass du jemanden findest,"}
          <br />
          {'Die die Lust in dir entzündet,'}
          <br />
          {'Der du deine Schätze zeigen kannst'}
          <br />
          {'Und die mit dir ergründet, was dich stärkt'}
          <br />
          {'Dich hält, wenn du verschwindest'}
          <br />
          {'Und führt, wo du blind bist'}
          <br />
          {'Und dann verkündet:'}
        </p>
        <p>
          <strong>{'Ich werde bei dir sein'}</strong>
          <br />
          <strong>{'Ich werde bei dir sein'}</strong>
          <br />
          <strong>{'Ich werde bei dir sein, die ganze Zeit'}</strong>
          <br />
          <strong>{'Die ganze Zeit!'}</strong>
        </p>
        <p>
          {"Ich wünsch' dir, dass sich deine Wege kreuzen"}
          <br />
          {'Mit einem Wesen, das dir treu ist -'}
          <br />
          {'Oh mögt ihr euch erleuchten'}
          <br />
          {'Mit den Feuern eurer selbst'}
          <br />
          {'Und ihr steuert in eine Welt'}
          <br />
          {'Die ist ach so bunt, so neu, so unerzählt'}
          <br />
          {'Und voller Freunde sagst du dann zu diesem Mensch:'}
        </p>
        <p>
          <strong>{'Ich werde bei dir sein'}</strong>
          <br />
          <strong>{'Ich werde bei dir sein'}</strong>
          <br />
          <strong>{'Ich werde bei dir sein, die ganze Zeit'}</strong>
          <br />
          <strong>{'Die ganze Zeit!'}</strong>
        </p>
        <p>
          {"Und die Suche nach diesem Mensch ist verzwickt, ich kenn's"}
          <br />
          {'Und es gibt kein Patent, keinen Kompass, der dich richtig lenkt'}
          <br />
          {"Und doch ein kleines Geheimnis, solang du nicht nur im Kreis gehst, glaub' ich,"}
          <br />
          {'Geht es voran, und die Richtung, die zeigt sich'}
          <br />
          {'Ob Schritt für Schritt, ob du fliegst oder schwimmst'}
          <br />
          {'Da ist ein Pfad, der vor dir liegt, vertrau deinem siebten Sinn'}
          <br />
          {"Bis du am Ende einer Sackgasse 'nen riesen Spiegel findest"}
          <br />
          {'Und du gehst hin, schaust hinein, sag mir: Wer steht da und grinst?'}
        </p>
        <p>
          <strong>{'Ba, dap n da da da'}</strong>
          <br />
          <strong>{'Die ganze Zeit!'}</strong>
          <br />
          <strong>{'Die ganze Zeit!'}</strong>
          <br />
          <strong>{'Die ganze Zeit!'}</strong>
        </p>
      </Song>
    </>
  )
}
