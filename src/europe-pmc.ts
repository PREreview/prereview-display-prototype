import * as RTE from 'fp-ts/ReaderTaskEither'
import { constant, flow } from 'fp-ts/function'
import { DoiD } from '../packages/doi-ts'
import { ensureSuccess, getRequest, send } from '../packages/fetch-fp-ts'
import { withQuery } from '../packages/url-ts'
import { decode, logError } from './api'
import * as d from './decoder'

const AuthorD = d.union(
  d.struct({
    firstName: d.string,
    lastName: d.string,
  }),
  d.struct({
    collectiveName: d.string,
  }),
)

const EuropePmcRecordD = d.struct({
  authorList: d.struct({
    author: d.readonlyNonEmptyArray(AuthorD),
  }),
  doi: DoiD,
  title: d.string,
})

const SearchD = d.struct({
  resultList: d.struct({
    result: d.readonlyArray(EuropePmcRecordD),
  }),
})

export type EuropePmcRecord = d.TypeOf<typeof EuropePmcRecordD>
export type Author = d.TypeOf<typeof AuthorD>

const search = flow(
  (query: string) =>
    new URLSearchParams({
      query: `${query} (PUBLISHER:"bioRxiv" OR PUBLISHER:"medRxiv") sort_date:y`,
      format: 'json',
      resultType: 'core',
    }),
  withQuery(`https://www.ebi.ac.uk/europepmc/webservices/rest/search`),
  getRequest,
  send,
  RTE.chainEitherKW(ensureSuccess),
  RTE.orElseFirstW(logError('Unable to search Europe PMC')),
)

const decodeResults = decode(SearchD, 'Unable to decode results from Europe PMC')

export const searchFor = flow(
  search,
  RTE.chainW(decodeResults),
  RTE.bimap(constant(new Error('Unable to read from Europe PMC')), results => results.resultList.result),
)
