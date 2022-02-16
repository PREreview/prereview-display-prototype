import * as IO from 'fp-ts/IO'
import { pipe } from 'fp-ts/function'
import * as c from 'io-ts/Codec'
import * as d from 'io-ts/Decoder'
import * as uuid from 'uuid'

type UuidVersion = 1 | 2 | 3 | 4 | 5

export type Uuid<V extends UuidVersion = UuidVersion> = string & UuidBrand

export const UuidD = pipe(d.string, d.refine(isUuid, 'UuidD'))

export const UuidC = c.fromDecoder(UuidD)

export function v4(): IO.IO<Uuid<4>> {
  return () => uuid.v4() as Uuid<4>
}

export function isUuid(value: string): value is Uuid {
  return uuid.validate(value)
}

interface UuidBrand {
  readonly Uuid: unique symbol
}
