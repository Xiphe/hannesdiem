import { Release } from '@hannesdiem/content-components'
import { release } from './yunorun.ts'

export const title = release.title

export default function Content() {
  return (
    <>
      <Release {...release}>
        <h2>{'The Machinery of Mind and Heart'}</h2>
        <p>
          {
            "My mind is a complex engine, always active and calculating the next best move. It's like a machine with ten thousand gears and pinions, grinding day and night, anticipating every possibility ahead while rehearsing past situations for the last drop of refinement."
          }
        </p>
        <p>
          {
            'My heart, on the other hand, acts as an insomniac compass. Driven by values, fears, hopes, love, and aversion, it gives direction even when my mind is overwhelmed. But how do these two centers of decision-making co-exist?'
          }
        </p>
        <h4>{'Striving for Perfection'}</h4>
        <p>
          {
            "I've always aimed for perfection on the first try and every try after that. I didn't realize that this pursuit is neither sustainable nor desirable. Imperfect crafts are not only relatable but also true, unique, and a necessary step toward mastering something. The constant grind towards perfectionism can make the machinery creak and groan, leading to more harm than good."
          }
        </p>
        <h4>{'The Warning Signs'}</h4>
        <p>
          {
            'In order to work against the constant pull of subconscious driven-ness, I need to be aware of warning signs. But those are often difficult to identify. They come disguised as routines, hidden in subtext, and covered beneath hope. It takes effort and patience to unveil them, and then it takes focus and persistency to act upon them.'
          }
        </p>
        <h4>{'The Trap of Mental Momentum'}</h4>
        <p>
          {
            "These dynamics create a form of mental momentum, akin to riding a bicycle. On a bike, you need a certain speed to avoid falling. Likewise, I might be aware that I've taken on too much, but the fear of slowing down, of losing that momentum and 'falling,' prevents me from doing so. It's a vicious cycle. The more I push, the more momentum I gain, making it increasingly challenging to apply the brakes. What happens when we press the gas pedal and it gets stuck? How do we regain control?"
          }
        </p>
        <h4>{'The Questions We Face'}</h4>
        <p>
          {
            'With all of this, I hope it becomes a little clearer why seemingly straightforward questions can be so difficult to navigate. Queries like "Why don\'t you run home? Why don\'t you stop?" are often well-intentioned but can sound mocking when asked by myself, society, or others. From the outside, the journey may seem deceptively simple and ironically, in hindsight, the path often does boil down to a few simple steps. The real challenge, and often the most misunderstood part, is figuring out what those steps are in the first place.'
          }
        </p>
        <h2>
          <a href={'https://www.youtube.com/watch?v=6jG7TG1TUQ4'}>{'Official Music Video'}</a>
        </h2>
      </Release>
    </>
  )
}
