import * as S from 'fp-ts/Show'

export * from 'fp-ts/Date'

export const Show: S.Show<Date> = {
  show: date => date.toISOString(),
}
