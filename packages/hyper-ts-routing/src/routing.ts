import * as R from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Tuple'
import { Lazy, flow } from 'fp-ts/function'
import { Connection } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'

export const routingMiddleware: <Err>(
  onNone: Lazy<Err>,
) => <R, I, O, A>(
  parser: R.Parser<RM.ReaderMiddleware<R, I, O, Err, A>>,
) => RM.ReaderMiddleware<R, I, O, Err, A> = onNone => flow(fromParser(onNone), RM.fromConnection, RM.iflatten as any)

const fromParser =
  <Err, A>(onNone: Lazy<Err>) =>
  (parser: R.Parser<A>) =>
    flow(routeFromConnection, parser.run, E.fromOption(onNone), E.map(T.fst))

const routeFromConnection = flow(getOriginalUrl, R.Route.parse)

function getOriginalUrl<I>(c: Connection<I>) {
  return c.getOriginalUrl()
}
