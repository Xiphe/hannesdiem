import { Song } from '@hannesdiem/content-components'
import { songs } from '../../songs.ts'

const { slug, ...song } = songs.yunorun

export const title = song.title

export default function Content() {
  return (
    <>
      <Song {...song}>
        <p>
          {"You're a ten dimensional machinery"}
          <br />
          {"You're an engine fluctuating between form and fantasy"}
          <br />
          {'Ten thousand gears and pinions grinding day and night'}
          <br />
          {'And an insomniac compass navigating though the fright'}
        </p>
        <p>
          {'All the levers stand at full tilt all the time'}
          <br />
          {"By now they're barely movable by all the rust and all the grime"}
          <br />
          {'And relentlessly you target every peak'}
          <br />
          {'Your only option seems: Continue being on a streak!'}
        </p>
        <p>
          {'And through the groaning and the teeming'}
          <br />
          {'You hear a thousand voices screaming'}
          <br />
          {'Are you insane? What are you doing? Where are you going?'}
        </p>
        <p>
          <strong>{"Why the fuck ain't you running?"}</strong>
          <br />
          {"Ain't you running, ain't you running?"}
          <br />
          {'Running home.'}
        </p>
        <p>
          {'Through impassable realms you creep ahead'}
          <br />
          {'The drainers come and gorge and the doubters swarm and spread'}
          <br />
          {'Every warning sign, you swiftly brush aside'}
          <br />
          {'With a faint determined will and a heart of pain and pride'}
        </p>
        <p>
          {'And through the groaning and the teeming'}
          <br />
          {'You hear a thousand voices screaming'}
          <br />
          {'Are you insane? What are you doing? Where are you going?'}
        </p>
        <p>
          <strong>{"Why the fuck ain't you running?"}</strong>
          <br />
          {"Ain't you running, ain't you running?"}
          <br />
          {'Running home.'}
        </p>
      </Song>
    </>
  )
}
