import { constant, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { routingMiddleware } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { handleError } from './http-error'
import { router } from './router'

const routerMiddleware = pipe(router, routingMiddleware(constant(new NotFound())))

export const appMiddleware = pipe(routerMiddleware, RM.orElseMiddlewareK(handleError))
