import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import * as c from 'io-ts/Codec'
import * as d from 'io-ts/Decoder'
import * as e from 'io-ts/Encoder'

export const UrlD = pipe(d.string, d.parse(fromString))

export const UrlE: e.Encoder<string, URL> = {
  encode: toString,
}

export const UrlC = c.make(UrlD, UrlE)

export function withQuery(base: string) {
  return (query: URLSearchParams) => new URL(`?${query}`, base)
}

export function withBase(base: string) {
  return (input: string) => new URL(input, base)
}

export function toString(url: URL): string {
  return url.href
}

function fromString(value: string) {
  return E.tryCatch(
    () => new URL(value),
    flow(E.toError, error => d.error(value, error.message)),
  )
}
