import doiRegex from 'doi-regex'
import { pipe } from 'fp-ts/function'
import * as c from 'io-ts/Codec'
import * as d from 'io-ts/Decoder'
import { withBase } from 'url-ts'

export type DoiPrefix = string & DoiPrefixBrand
export type Doi<P extends DoiPrefix = DoiPrefix> = `10.${P}${string}/${string}` & DoiBrand

export const DoiD = pipe(d.string, d.refine(isDoi, 'DoiD'))

export const DoiC = c.fromDecoder(DoiD)

export const toUrl: (doi: Doi) => URL = withBase('https://doi.org')

function isDoi(value: string): value is Doi {
  return doiRegex({ exact: true }).test(value)
}

interface DoiPrefixBrand {
  readonly DoiPrefix: unique symbol
}

interface DoiBrand {
  readonly Doi: unique symbol
}
