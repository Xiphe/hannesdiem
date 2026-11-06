import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { createVisibleAnimation } from '../app/temple/visible-animation.ts'

function browser(t: TestContext) {
  const document = Object.assign(new EventTarget(), { hidden: false })
  let nextFrame = 0
  const frames = new Map<number, FrameRequestCallback>()
  let intersection: (visible: boolean) => void = () => {}
  let observed: Element | undefined
  const globals = {
    document,
    requestAnimationFrame(callback: FrameRequestCallback) {
      frames.set(++nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame(frame: number) {
      frames.delete(frame)
    },
    IntersectionObserver: class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = (isIntersecting) =>
          callback([{ isIntersecting } as IntersectionObserverEntry], this as any)
      }
      observe(target: Element) {
        observed = target
      }
      disconnect() {
        observed = undefined
      }
    },
  }
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { configurable: true, value })
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    })
  }
  return {
    frames,
    get observed() {
      return observed
    },
    intersect(visible: boolean) {
      intersection(visible)
    },
    hide(hidden: boolean) {
      document.hidden = hidden
      document.dispatchEvent(new Event('visibilitychange'))
    },
    tick(now: number) {
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) callback(now)
    },
  }
}

test('requests coalesce; the artwork decides whether to continue or stay idle', (t) => {
  const controller = new AbortController()
  t.after(() => controller.abort())
  const env = browser(t)
  const draws: number[] = []
  const animation = createVisibleAnimation(controller.signal, {
    draw(now) {
      draws.push(now)
      if (now < 20) animation.request()
    },
    reset() {},
  })
  animation.request()
  animation.request()
  assert.equal(env.frames.size, 1)
  env.tick(10)
  assert.deepEqual(draws, [10])
  assert.equal(env.frames.size, 1)
  env.tick(20)
  assert.deepEqual(draws, [10, 20])
  assert.equal(env.frames.size, 0)
  animation.request()
  animation.stop()
  env.tick(30)
  assert.deepEqual(draws, [10, 20])
})

test('hidden documents cancel work and resume with a reset artwork clock', (t) => {
  const controller = new AbortController()
  t.after(() => controller.abort())
  const env = browser(t)
  let last: number | undefined
  const intervals: number[] = []
  const animation = createVisibleAnimation(controller.signal, {
    draw(now) {
      intervals.push(last === undefined ? 0 : now - last)
      last = now
      animation.request()
    },
    reset() {
      last = undefined
    },
  })
  animation.request()
  env.tick(10)
  env.tick(20)
  env.hide(true)
  animation.request()
  assert.equal(animation.active, false)
  assert.equal(env.frames.size, 0)
  env.tick(2000)
  assert.deepEqual(intervals, [0, 10])
  env.hide(false)
  env.tick(3000)
  assert.deepEqual(intervals, [0, 10, 0])
})

test('observed artwork waits for visibility; abort cancels and disconnects it permanently', (t) => {
  const env = browser(t)
  const controller = new AbortController()
  const target = {} as Element
  let draws = 0
  let resets = 0
  let reduced = false
  const animation = createVisibleAnimation(controller.signal, {
    target,
    draw() {
      draws++
    },
    reset() {
      resets++
    },
    resume() {
      // Circle's reduced-motion rest is synchronous, without a frame or simulation.
      if (reduced) animation.stop()
      else animation.request()
    },
  })
  assert.equal(env.observed, target)
  animation.request()
  assert.equal(env.frames.size, 0)
  env.intersect(true)
  env.tick(10)
  assert.equal(draws, 1)
  animation.request()
  env.intersect(false)
  assert.equal(resets, 1)
  assert.equal(env.frames.size, 0)
  env.hide(true)
  env.intersect(true)
  animation.request()
  assert.equal(env.frames.size, 0)
  reduced = true
  env.hide(false)
  assert.equal(resets, 3)
  assert.equal(env.frames.size, 0)
  reduced = false
  animation.request()
  controller.abort()
  assert.equal(env.frames.size, 0)
  assert.equal(env.observed, undefined)
  animation.request()
  env.hide(false)
  env.tick(20)
  assert.equal(draws, 1)
  assert.equal(animation.active, false)
})

test('an already aborted island allocates no observers or frames', (t) => {
  const env = browser(t)
  const controller = new AbortController()
  controller.abort()
  const animation = createVisibleAnimation(controller.signal, {
    target: {} as Element,
    draw() {
      assert.fail('aborted artwork cannot draw')
    },
    reset() {},
  })
  animation.request()
  assert.equal(env.observed, undefined)
  assert.equal(env.frames.size, 0)
})
