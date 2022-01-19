import * as E from 'fp-ts/Either'
import * as eq from 'fp-ts/Eq'
import * as ord from 'fp-ts/Ord'
import { Refinement } from 'fp-ts/Refinement'
import * as show from 'fp-ts/Show'
import { Lazy, flow } from 'fp-ts/function'
import * as S from 'fp-ts/string'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 */
export type Method = typeof methods[number]

const rfc7231Methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE'] as const

const rfc5789Methods = ['PATCH'] as const

const rfc4918Methods = ['PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK'] as const

const methods = [...rfc7231Methods, ...rfc5789Methods, ...rfc4918Methods] as const

// -------------------------------------------------------------------------------------
// refinements
// -------------------------------------------------------------------------------------

/**
 * @category refinements
 */
export const isMethod: Refinement<unknown, Method> = (u: unknown): u is Method => methods.includes(u as Method)

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 */
export const parse: <Err>(onFalse: Lazy<Err>) => (value: string) => E.Either<Err, Method> = onFalse =>
  flow(S.toUpperCase, E.fromPredicate(isMethod, onFalse))

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 */
export const Eq: eq.Eq<Method> = S.Eq

/**
 * @category instances
 */
export const Ord: ord.Ord<Method> = S.Ord

/**
 * @category instances
 */
export const Show: show.Show<Method> = S.Show
