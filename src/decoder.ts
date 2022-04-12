import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { Json, parse } from 'fp-ts/Json'
import * as NEA from 'fp-ts/NonEmptyArray'
import * as O from 'fp-ts/Option'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import * as d from 'io-ts/Decoder'

export * from 'io-ts/Decoder'

export const json: d.Decoder<unknown, Json> = {
  decode: i =>
    pipe(
      d.string.decode(i),
      E.chain(
        flow(
          parse,
          E.altW(() => d.failure(i, 'JSON')),
        ),
      ),
    ),
}

export const optional: <I, A>(or: d.Decoder<I, A>) => d.Decoder<undefined | I, O.Option<A>> = or =>
  fromFunction(i => (i === undefined ? E.right(O.none) : pipe(i, or.decode, E.map(O.some))))

export const readonlyArray: <I, A>(item: d.Decoder<unknown, A>) => d.Decoder<I, ReadonlyArray<A>> = flow(
  d.array,
  d.readonly,
)

export const nonEmptyArray: <I, A>(item: d.Decoder<unknown, A>) => d.Decoder<I, NEA.NonEmptyArray<A>> = flow(
  d.array,
  d.refine(A.isNonEmpty, 'nonEmptyArray'),
)

export const readonlyNonEmptyArray: <I, A>(item: d.Decoder<unknown, A>) => d.Decoder<I, RNEA.ReadonlyNonEmptyArray<A>> =
  flow(nonEmptyArray, d.readonly)

function fromFunction<I, A>(decode: (i: I) => E.Either<d.DecodeError, A>): d.Decoder<I, A> {
  return { decode }
}
