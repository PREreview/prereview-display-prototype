import { isDoi } from 'doi-ts'
import { parseDate } from 'fp-ts-std/Date'
import * as O from 'fp-ts/Option'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { intercalate } from 'fp-ts/Semigroup'
import { pipe } from 'fp-ts/function'
import { OrcidUrlD } from 'orcid-ts'
import * as d from './decoder'
import * as S from './string'

const DoiD = d.fromRefinement(isDoi, 'DOI')
const DatePartsD = d.tuple(d.number, d.number, d.number)

export const CrossrefDoiD = d.struct({
  abstract: d.optional(d.string),
  author: d.readonlyArray(
    d.union(
      d.struct({
        name: d.string,
      }),
      d.struct({
        ORCID: d.optional(OrcidUrlD),
        given: d.string,
        family: d.string,
      }),
    ),
  ),
  DOI: DoiD,
  published: d.struct({
    'date-parts': d.readonlyNonEmptyArray(DatePartsD),
  }),
  title: d.string,
})

export type CrossrefDoi = d.TypeOf<typeof CrossrefDoiD>
type DateParts = d.TypeOf<typeof DatePartsD>

export function getFirstPublishedDate(doi: CrossrefDoi): O.Option<Date> {
  return pipe(doi.published['date-parts'][0], getDate)
}

function getDate(dateParts: DateParts): O.Option<Date> {
  return pipe(dateParts, RNEA.foldMap(pipe(S.Semigroup, intercalate('-')))(String), parseDate)
}
