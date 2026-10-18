import { Song } from '@hannesdiem/content-components'

export const title = 'Absinth'

export default function Content() {
  return (
    <>
      <Song
        title={'Absinth'}
        creationDate={'2014-06-04T12:00:00+00:00'}
        hideCreationDay={true}
        authors={[
          { name: 'Hannes Diem', link: 'https://hannesdiem.de' },
          { name: 'Christina Düwel' },
        ]}
      >
        <p>
          {'Lass mich in dein Kopf'}
          <br />
          {"Und hinter deine Stirne seh'n"}
          <br />
          {'Was dort steht ist rabenschwarz'}
          <br />
          {'Und doch so wunderschön'}
          <br />
          {'Lass mich in dein Herz'}
          <br />
          {'Und tief in deine Venen ein'}
          <br />
          {"Lass mich deine Trauer spür'n"}
          <br />
          {"Und deine Freude leih'n"}
        </p>
        <p>
          {'Lass mich deine Welt noch einmal'}
          <br />
          {"Ohne Schwerkraft seh'n"}
          <br />
          {'Lass mich dort wo einst dein Stolz'}
          <br />
          {"Ein Mahlwerk für dich dreh'n"}
          <br />
          {'Lass mich deine Wahrheit'}
          <br />
          {'noch ein bisschen korregieren'}
          <br />
          {'Lass mich ein, es geht dir gut'}
          <br />
          {"Du hast nichts zu verlier'n"}
        </p>
        <p>
          {'Treff dunkelgrün'}
          <br />
          {'Auf deine Kehle'}
          <br />
          {'Und du krigst einfach nicht genug'}
          <br />
          {'Kein Wort zählt nur'}
          <br />
          {'meine Befehle'}
          <br />
          {"Leben in dei'm Blut"}
        </p>
        <p>
          <strong>{"Hab meine Worte in dein' Mund gelegt"}</strong>
          <br />
          {"Deine Stunden so gelebt als sein' sie mein"}
          <br />
          {'Und deine Taten für dich ausgewählt'}
          <br />
          {'Nur die Hoffnung und die Sorgen sind noch dein'}
          <br />
          {'Die Hoffnung und die Sorgen sind noch (dein)'}
        </p>
        <p>
          {"Dieses mal will ich verzei'n"}
          <br />
          {'Dieses eine mal bei dir sein'}
          <br />
          {'Dieses eine mal beben'}
          <br />
          {'Dieses mal lad ich dich ein'}
          <br />
          {"Dieses mal will ich mit dir schrei'n"}
          <br />
          {'Dieses eine mal Leben'}
        </p>
      </Song>
    </>
  )
}
