import * as c from 'io-ts/Codec'
import * as d from './decoder'
import * as e from './encoder'

export * from 'io-ts/Codec'

export const optional = <I, O, A>(codec: c.Codec<I, O, A>) => c.make(d.optional(codec), e.optional(codec))

export const readonlyArray = <I, O, A>(codec: c.Codec<unknown, O, A>) =>
  c.make(d.readonlyArray(codec), e.readonlyArray(codec))

export const readonlyNonEmptyArray = <I, O, A>(codec: c.Codec<unknown, O, A>) =>
  c.make(d.readonlyNonEmptyArray(codec), e.readonlyNonEmptyArray(codec))
