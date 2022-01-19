import * as O from 'fp-ts/Option'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow } from 'fp-ts/function'
import * as e from 'io-ts/Encoder'

export * from 'io-ts/Encoder'

export const optional: <I, A>(or: e.Encoder<I, A>) => e.Encoder<undefined | I, O.Option<A>> = or =>
  fromFunction(flow(O.map(or.encode), O.toUndefined))

export const readonlyArray = flow(e.array, e.readonly)

export const readonlyNonEmptyArray: <O, A>(
  item: e.Encoder<O, A>,
) => e.Encoder<RNEA.ReadonlyNonEmptyArray<O>, RNEA.ReadonlyNonEmptyArray<A>> = readonlyArray as any

export const string: e.Encoder<string, unknown> = fromFunction(String)

export function fromFunction<O, A>(encode: (value: A) => O): e.Encoder<O, A> {
  return { encode }
}
