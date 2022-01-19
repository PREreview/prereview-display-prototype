import * as R from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Tuple'
import { Lazy, flow } from 'fp-ts/function'
import { Connection, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'

export const routingMiddleware: <Err>(
  onNone: Lazy<Err>,
) => <A>(parser: R.Parser<A>) => M.Middleware<StatusOpen, StatusOpen, Err, A> = onNone =>
  flow(fromParser(onNone), M.fromConnection)

const fromParser =
  <Err>(onNone: Lazy<Err>) =>
  <A>(parser: R.Parser<A>) =>
    flow(routeFromConnection, parser.run, E.fromOption(onNone), E.map(T.fst))

const routeFromConnection = flow(getOriginalUrl, R.Route.parse)

function getOriginalUrl<I = StatusOpen>(c: Connection<I>) {
  return c.getOriginalUrl()
}
