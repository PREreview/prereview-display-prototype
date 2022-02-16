import { DoiC } from 'doi-ts'
import * as R from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import { pipe, tuple } from 'fp-ts/function'
import * as c from 'io-ts/Codec'
import { home } from './home'
import { logIn } from './log-in'
import { logOut } from './log-out'
import { NumberFromStringC, PositiveIntC } from './number'
import { preprint } from './preprint'
import { publishRapidReview } from './publish-rapid-review'
import { publishReview } from './publish-review'
import { review } from './review'
import { search } from './search'

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

export function query<A>(codec: c.Codec<unknown, Record<string, R.QueryValues>, A>): R.Match<A> {
  return new R.Match(
    new R.Parser(r =>
      O.Functor.map(O.fromEither(codec.decode(r.query)), query => tuple(query, new R.Route(r.parts, {}))),
    ),
    new R.Formatter((r, query) => new R.Route(r.parts, codec.encode(query))),
  )
}

export const homeMatch = R.end

export const preprintMatch = pipe(R.lit('preprints'), R.then(type('doi', DoiC)), R.then(R.end))

export const publishReviewMatch = pipe(
  R.lit('preprints'),
  R.then(type('doi', DoiC)),
  R.then(R.lit('review')),
  R.then(R.end),
)

export const publishRapidReviewMatch = pipe(
  R.lit('preprints'),
  R.then(type('doi', DoiC)),
  R.then(R.lit('rapid-review')),
  R.then(R.end),
)

export const reviewMatch = pipe(
  R.lit('reviews'),
  R.then(type('id', pipe(NumberFromStringC, c.compose(PositiveIntC)))),
  R.then(R.end),
)

export const searchMatch = pipe(R.lit('search'), R.then(query(c.partial({ query: c.string }))), R.then(R.end))

export const logInMatch = pipe(R.lit('log-in'), R.then(R.end))

export const logOutMatch = pipe(R.lit('log-out'), R.then(R.end))

export const router = pipe(
  [
    pipe(
      homeMatch.parser,
      R.map(() => home),
    ),
    pipe(
      preprintMatch.parser,
      R.map(params => preprint(params.doi)),
    ),
    pipe(
      reviewMatch.parser,
      R.map(params => review(params.id)),
    ),
    pipe(
      publishReviewMatch.parser,
      R.map(params => publishReview(params.doi)),
    ),
    pipe(
      publishRapidReviewMatch.parser,
      R.map(params => publishRapidReview(params.doi)),
    ),
    pipe(
      searchMatch.parser,
      R.map(params => search(params.query ?? '')),
    ),
    pipe(
      logInMatch.parser,
      R.map(() => logIn),
    ),
    pipe(
      logOutMatch.parser,
      R.map(() => logOut),
    ),
  ],
  M.concatAll(R.getParserMonoid()),
)
