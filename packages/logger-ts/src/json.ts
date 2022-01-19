import { Json } from 'fp-ts/Json'
import * as S from 'fp-ts/Show'
import stringify from 'safe-stable-stringify'

export * from 'fp-ts/Json'

export const Show: S.Show<Json> = {
  show: stringify,
}
