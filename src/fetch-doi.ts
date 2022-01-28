import * as DOI from 'doi-ts'
import { ensureSuccess, getRequest, send, withHeader } from 'fetch-fp-ts'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { constant, flow, pipe } from 'fp-ts/function'
import * as orcid from 'orcid-ts'
import { decode, logError } from './api'
import { CrossrefDoi, CrossrefDoiD, getFirstPublishedDate } from './crossref'
import { DataciteDoi, DataciteDoiD, getDescriptionText, getFirstAbstract, getFirstTitle } from './datacite'
import * as D from './decoder'
import * as S from './string'

export type Author = { name: string; orcid: O.Option<orcid.Orcid> }

export type DoiData = {
  abstract: O.Option<string>
  authors: ReadonlyArray<Author>
  doi: DOI.Doi
  published: O.Option<Date>
  title: string
}

const CrossrefDoiDataD = pipe(CrossrefDoiD, D.map(normalizeCrossrefData))
const DataciteDoiDataD = pipe(DataciteDoiD, D.map(normalizeDataciteData))
const DoiDataD = D.union(CrossrefDoiDataD, DataciteDoiDataD)

const fetchDoiResponse = flow(
  DOI.toUrl,
  getRequest,
  withHeader('Accept', 'application/vnd.datacite.datacite+json, application/json'),
  send,
  RTE.chainEitherKW(ensureSuccess),
  RTE.orElseFirstW(logError('Unable to fetch DOI data')),
)

const decodeDoiJson = decode(DoiDataD, 'Unable to decode DOI JSON')

export const fetchDoi = flow(
  fetchDoiResponse,
  RTE.chainW(decodeDoiJson),
  RTE.mapLeft(constant(new Error('Unable to read DOI'))),
)

function normalizeCrossrefData(doiData: CrossrefDoi): DoiData {
  return {
    ...doiData,
    abstract: pipe(doiData.abstract, O.map(S.remove('jats:'))),
    authors: pipe(
      doiData.author,
      RA.map(author => ({
        name: `${author.given} ${author.family}`,
        orcid: author.ORCID,
      })),
    ),
    doi: doiData.DOI,
    published: getFirstPublishedDate(doiData),
  }
}

function normalizeDataciteData(doiData: DataciteDoi): DoiData {
  return {
    ...doiData,
    abstract: pipe(getFirstAbstract(doiData), O.map(getDescriptionText)),
    authors: RA.empty,
    published: O.none,
    title: getFirstTitle(doiData),
  }
}
