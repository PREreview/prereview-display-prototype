import { replaceAll } from 'fp-ts-std/String'
import { identity, pipe } from 'fp-ts/function'
import * as S from 'fp-ts/string'
import * as c from './codec'
import * as d from './decoder'

export * from 'fp-ts/string'

export { prepend, append } from 'fp-ts-std/String'
export { join } from 'fp-ts-std/ReadonlyArray'

export type NonEmptyString = string & NonEmptyStringBrand

export const remove = (string: string) => pipe(S.empty, replaceAll(string))

export const NonEmptyStringD = pipe(d.string, d.refine(isNonEmptyString, 'NonEmptyString'))

export const NonEmptyStringC = c.fromDecoder(NonEmptyStringD)

export const nonEmpty: <T extends string>(string: T) => T extends '' ? never : T & NonEmptyString = identity as any

function isNonEmptyString(value: string): value is NonEmptyString {
  return value.length > 0
}

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}
