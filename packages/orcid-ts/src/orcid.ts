import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import * as c from 'io-ts/Codec'
import * as d from 'io-ts/Decoder'
import { toDashFormat } from 'orcid-utils'
import { UrlD, toString, withBase } from 'url-ts'

export type Orcid = string & OrcidBrand

export const OrcidD = pipe(d.string, d.refine(isOrcid, 'OrcidD'))

export const OrcidC = c.fromDecoder(OrcidD)

export const toUrl: (orcid: Orcid) => URL = withBase('https://orcid.org')

export const OrcidUrlD = pipe(UrlD, d.parse(fromUrl))

function fromUrl(url: URL) {
  return pipe(url, toString, fromString)
}

function fromString(value: string) {
  return E.tryCatch(
    () => toDashFormat(value) as Orcid,
    flow(E.toError, error => d.error(value, error.message)),
  )
}

function isOrcid(value: string): value is Orcid {
  try {
    return toDashFormat(value) === value
  } catch {
    return false
  }
}

interface OrcidBrand {
  readonly Orcid: unique symbol
}
