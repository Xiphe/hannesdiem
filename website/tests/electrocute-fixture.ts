import type { ElectroCuteSession } from '@hannesdiem/content-components'

/** Entirely synthetic; these dates, people and titles are not artist content. */
export const electroCuteSessions: readonly ElectroCuteSession[] = [1, 2, 3, 4].map((number) => ({
  id: `test-session-${number}`,
  title: `Test session ${String(number).padStart(2, '0')}`,
  recordedAt: `2023-01-${String(number * 7).padStart(2, '0')}`,
  src: '/fixture-media/electrocute.mp4',
  duration: 96,
  frameRate: 5,
  highlights:
    number === 1
      ? [
          {
            id: 'test-highlight-a',
            title: 'Test highlight A',
            person: 'Test listener A',
            // Synthetic avatar from the project's Heroicons User asset; no real profile uses it.
            avatarUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD30lEQVR4nOWbaU8aURSG778UB2tstS4xWm3ST+ICFUVUsNpvdcNdBFPXDkoViwuK4oaKdWmTJjVql59wmnPTscRGHeBe7ox8eJMJMHfO+3DuuRsQKasKMllEdACiRUQHIFpEdAAZBaCkqAk6nB7wzURgY+UMYtErKrzG19odHigptD0+AMXPG2F0MACnRz/h/Pj3vTqL/YLJ8RCUFtkfB4D6uh6I7V89aPy2YnuXYKnp1jeAt04v/UYTNR+fDR1Orz4B1Nf1pGQ+HgLPTCC8+nwyaX9fdyguaNAPAM9wkJl5Re6hJX0AKClqUlXtExW2iZmleQAdTi9z84retI5pH4A8s80NgDwV0T6AzdVzbgBwxqh5ADGG1f+/0WD/KrMBHO1dah/AxuoZNwDreugCcqYXwXaHhxuAtha39gGUFNoyeyIkZVXB2PAn5gBGBgLM45S4Lob2LplW/6J8HS2GpKwqqDN1MukKdDlcq7PlsBS3Lkh9Q8TDLT4pHVtiuJmRTHfAtDfXdHGNTUrXpujzZ1YYdH1UvSk67l7h1ueFAJDiiiMuaeXpCJ3V4bQZhdc4ycH3eAx1mgEgaVBEdACiRUQHkNEAcrKrqR49gIKn9WA1u2DQtQB+eRd2wt/g88H1TeXHa3wN38PPWC0ueo+uAeRkV0ODpY9W92RmhHjPh6ktCo5nlhDWDRoNJmixDTPdGwyvnUNz4xBtW9MAKsudsOQ/ZL4SVBTwH0BFmUObANpa3HAc/deveQmf4bCPageA0WCCvu457sZvC6fWLLoESdW8d3Q57eYVeUaCKUMgqdyMQ5Yo84oGev1iADjso8LNK8JRJ60AKsocaSl4anW8fw0vSlvTA8BoMNEZm2jTt7Xg20+qHpBEb2iyDgg3e5caX/fzBWA0mCAUPBFu9C6FgqcJZwFJdH9PtMmHZK7u4gdgZiIs3OBDmhpf5wMgL9cMp0c/hBt8SLi0zsupYw/AUqv99FeEhzLMAbi6fMKNqVVvp489AHkqItyYWs1ObLIHEF7j9+MnkT+mImo/GN25EG5MraLb39kDODnU/ggQPxIwB7A4FxVuLJF1AXMAhfkNMNIfoKe2og3eJYwNY8TDWOYApL/KNdbQ7e752R3hhhUtL8bA2eyGvCfqJ0BJA5Di9LK8DXrfyTQAFn+OUCt8Fj4Tn11R5kw6fonlrjCmHS6V8Wx/a/0rcyDYJu4B2qz9CaV42gBIt4Tp+KqyA5ptQ9DbJcPs5CYE5g/ogcnB7sVNLcGKjcPWZugLLAeOaQGbfh+mszl7wyBtI5nUFg5A0omI6ABEi4gOQLSI6ABE6w++HcT7DM5klwAAAABJRU5ErkJggg==',
            start: 12,
            end: 32,
          },
          {
            id: 'test-highlight-b',
            title: 'Test highlight B',
            person: 'Test listener B',
            start: 26,
            end: 58,
          },
          {
            id: 'test-highlight-c',
            title: 'Test highlight C',
            person: 'Test listener A',
            start: 70,
            end: 90,
          },
        ]
      : [],
}))
