import { constant, flow, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { routingMiddleware } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { home } from './home'
import { handleError } from './http-error'
import { preprint } from './preprint'
import { publishReview } from './publish-review'
import { review } from './review'
import { router } from './router'

const routerMiddleware = pipe(
  router,
  routingMiddleware(constant(new NotFound())),
  RM.fromMiddleware,
  RM.ichainW(route =>
    match(route)
      .with({ _type: 'Home' }, () => home)
      .with({ _type: 'Preprint' }, route => pipe(route.doi, preprint))
      .with({ _type: 'Review' }, route => pipe(route.id, review))
      .with({ _type: 'PublishReview' }, route => pipe(route.doi, publishReview))
      .exhaustive(),
  ),
)

export const appMiddleware = pipe(routerMiddleware, RM.orElseW(flow(handleError, RM.fromMiddleware)))
