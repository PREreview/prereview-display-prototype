import { Doi } from 'doi-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { fetchDoi } from '../fetch-doi'
import { searchRecords } from '../zenodo'

export const fetchDetails = (doi: Doi) =>
  pipe(
    RTE.Do,
    RTE.apS('preprint', pipe(doi, fetchDoi)),
    RTE.apS('reviews', pipe(new URLSearchParams({ q: `related.identifier:"${doi}"` }), searchRecords)),
  )
