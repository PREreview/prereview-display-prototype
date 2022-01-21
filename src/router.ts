import { Doi, DoiC } from 'doi-ts'
import * as R from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import { pipe, tuple } from 'fp-ts/function'
import * as c from 'io-ts/Codec'
import { NumberFromStringC, PositiveInt, PositiveIntC } from './number'

const singleton = <K extends string, V>(k: K, v: V): { [_ in K]: V } => ({ [k as any]: v } as any)

export function type<K extends string, A>(k: K, codec: c.Codec<string, string, A>): R.Match<{ [_ in K]: A }> {
  return new R.Match(
    new R.Parser(r => {
      if (r.parts.length === 0) {
        return O.none
      } else {
        const head = r.parts[0]
        const tail = r.parts.slice(1)
        return O.Functor.map(O.fromEither(codec.decode(head)), a => tuple(singleton(k, a), new R.Route(tail, r.query)))
      }
    }),
    new R.Formatter((r, o) => new R.Route(r.parts.concat(codec.encode(o[k])), r.query)),
  )
}

class Home {
  readonly _type = 'Home'
}

class Preprint {
  readonly _type = 'Preprint'

  constructor(readonly doi: Doi) {}
}

class Review {
  readonly _type = 'Review'

  constructor(readonly id: PositiveInt) {}
}

class PublishReview {
  readonly _type = 'PublishReview'

  constructor(readonly doi: Doi) {}
}

export const homeMatch = R.end

export const preprintMatch = pipe(R.lit('preprints'), R.then(type('doi', DoiC)), R.then(R.end))

export const publishReviewMatch = pipe(
  R.lit('preprints'),
  R.then(type('doi', DoiC)),
  R.then(R.lit('review')),
  R.then(R.end),
)

export const reviewMatch = pipe(
  R.lit('reviews'),
  R.then(type('id', pipe(NumberFromStringC, c.compose(PositiveIntC)))),
  R.then(R.end),
)

export const router = pipe(
  [
    pipe(
      homeMatch.parser,
      R.map(() => new Home()),
    ),
    pipe(
      preprintMatch.parser,
      R.map(params => new Preprint(params.doi)),
    ),
    pipe(
      reviewMatch.parser,
      R.map(params => new Review(params.id)),
    ),
    pipe(
      publishReviewMatch.parser,
      R.map(params => new PublishReview(params.doi)),
    ),
  ],
  M.concatAll(R.getParserMonoid()),
)
