import { isDoi } from 'doi-ts'
import { FetchEnv, Request, hasStatus, send, setBody, setHeader } from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { constant, flow, identity, pipe } from 'fp-ts/function'
import { StatusCodes } from 'http-status-codes'
import { OrcidC, OrcidD } from 'orcid-ts'
import { URL } from 'url'
import { UrlC, UrlD, withQuery } from 'url-ts'
import { decode, logError } from './api'
import * as c from './codec'
import * as d from './decoder'
import { PositiveInt, PositiveIntD } from './number'
import { NonEmptyStringC } from './string'

const DoiD = d.fromRefinement(isDoi, 'DOI')
const DoiC = c.fromDecoder(DoiD)

export type ZenodoEnv = {
  zenodoApiKey: string
}

const RelationC = c.fromDecoder(
  d.union(d.literal('isAlternateIdentifier'), d.literal('isVersionOf'), d.literal('reviews')),
)

const RelatedIdentifierC = c.sum('scheme')({
  doi: c.struct({
    identifier: DoiC,
    relation: RelationC,
    scheme: c.literal('doi'),
  }),
  url: c.struct({
    identifier: UrlC,
    relation: RelationC,
    scheme: c.literal('url'),
  }),
})

const DepositMetadataC = c.struct({
  upload_type: c.literal('publication'),
  publication_type: c.literal('article'),
  creators: c.readonlyNonEmptyArray(
    c.struct({
      name: NonEmptyStringC,
      orcid: c.optional(OrcidC),
    }),
  ),
  description: NonEmptyStringC,
  keywords: c.optional(c.readonlyNonEmptyArray(c.string)),
  related_identifiers: c.readonlyNonEmptyArray(RelatedIdentifierC),
  title: NonEmptyStringC,
  communities: c.readonlyArray(
    c.struct({
      identifier: NonEmptyStringC,
    }),
  ),
})

export type DepositMetadata = c.TypeOf<typeof DepositMetadataC>

const BaseDepositionD = d.struct({
  id: PositiveIntD,
  metadata: DepositMetadataC,
})

const UnsubmittedDepositionD = pipe(
  BaseDepositionD,
  d.intersect(
    d.struct({
      links: d.struct({
        bucket: UrlD,
        publish: UrlD,
      }),
      state: d.literal('unsubmitted'),
      submitted: d.literal(false),
    }),
  ),
)

const SubmittedDepositionD = pipe(
  BaseDepositionD,
  d.intersect(
    d.struct({
      doi: DoiD,
      links: d.struct({
        latest_html: UrlD,
      }),
      state: d.literal('done'),
      submitted: d.literal(true),
    }),
  ),
)

const ZenodoRecordD = d.struct({
  doi: DoiD,
  id: PositiveIntD,
  links: d.struct({
    latest_html: UrlD,
  }),
  metadata: d.struct({
    creators: d.readonlyNonEmptyArray(
      d.struct({
        name: d.string,
        orcid: d.optional(OrcidD),
      }),
    ),
    keywords: d.optional(d.readonlyNonEmptyArray(d.string)),
    description: d.string,
    related_identifiers: d.readonlyNonEmptyArray(RelatedIdentifierC),
    title: d.string,
  }),
})

const SearchD = d.struct({
  hits: d.struct({
    hits: d.readonlyArray(ZenodoRecordD),
  }),
})

export type UnsubmittedDeposition = d.TypeOf<typeof UnsubmittedDepositionD>
export type SubmittedDeposition = d.TypeOf<typeof SubmittedDepositionD>

export type ZenodoRecord = d.TypeOf<typeof ZenodoRecordD>
type ZenodoRelatedIdentifier = c.TypeOf<typeof RelatedIdentifierC>

const fetchFromZenodo = (request: Request) =>
  pipe(
    RTE.ask<FetchEnv & ZenodoEnv>(),
    RTE.map(({ zenodoApiKey }) => pipe(request, setHeader('Authorization', `Bearer ${zenodoApiKey}`))),
    RTE.chainW(send),
  )

const getFileLink = (fileName: string) => (deposition: UnsubmittedDeposition) =>
  new URL(fileName, `${deposition.links.bucket}/`)
const getPublishLink = (deposition: UnsubmittedDeposition) => deposition.links.publish
const recordUrl = (id: PositiveInt) => new URL(id.toString(), 'https://sandbox.zenodo.org/api/records/')

const fetchRecord = flow(
  recordUrl,
  Request('GET'),
  fetchFromZenodo,
  RTE.filterOrElseW(hasStatus(StatusCodes.OK), identity),
  RTE.orElseFirstW(logError('Unable to fetch record from Zenodo')),
)

const search = flow(
  withQuery(`https://sandbox.zenodo.org/api/records/`),
  Request('GET'),
  fetchFromZenodo,
  RTE.filterOrElseW(hasStatus(StatusCodes.OK), identity),
  RTE.orElseFirstW(logError('Unable to search Zenodo')),
)

const decodeRecord = decode(ZenodoRecordD, 'Unable to decode record from Zenodo')
const decodeSubmittedDeposition = decode(SubmittedDepositionD, 'Unable to decode deposition from Zenodo')
const decodeUnsubmittedDeposition = decode(UnsubmittedDepositionD, 'Unable to decode deposition from Zenodo')
const decodeResults = decode(SearchD, 'Unable to decode results from Zenodo')

export const getRecord = flow(
  fetchRecord,
  RTE.chainW(decodeRecord),
  RTE.mapLeft(constant(new Error('Unable to read from Zenodo'))),
)

export const searchRecords = flow(
  search,
  RTE.chainW(decodeResults),
  RTE.bimap(constant(new Error('Unable to read from Zenodo')), results => results.hits.hits),
)

type File = {
  name: string
  type: string
  content: string
}

export const uploadFile = (file: File) =>
  flow(
    getFileLink(file.name),
    Request('PUT'),
    setBody(file.content, file.type),
    fetchFromZenodo,
    RTE.filterOrElseW(hasStatus(StatusCodes.OK), identity),
    RTE.orElseFirstW(logError('Unable to upload file to Zenodo')),
    RTE.mapLeft(constant(new Error('Unable to upload file to Zenodo'))),
  )

export const publishDeposition = flow(
  getPublishLink,
  Request('POST'),
  fetchFromZenodo,
  RTE.filterOrElseW(hasStatus(StatusCodes.ACCEPTED), identity),
  RTE.orElseFirstW(logError('Unable to publish deposition on Zenodo')),
  RTE.chainW(decodeSubmittedDeposition),
  RTE.mapLeft(constant(new Error('Unable to publish deposition on Zenodo'))),
)

export const createDeposition = (metadata: DepositMetadata) =>
  pipe(
    new URL('https://sandbox.zenodo.org/api/deposit/depositions'),
    Request('POST'),
    setBody(JSON.stringify({ metadata: DepositMetadataC.encode(metadata) }), 'application/json'),
    fetchFromZenodo,
    RTE.filterOrElseW(hasStatus(StatusCodes.CREATED), identity),
    RTE.orElseFirstW(logError('Unable to create deposition on Zenodo')),
    RTE.chainW(decodeUnsubmittedDeposition),
    RTE.mapLeft(constant(new Error('Unable to create Zenodo deposition'))),
  )

export const hasScheme =
  <S extends ZenodoRelatedIdentifier['scheme']>(scheme: S) =>
  <T extends ZenodoRelatedIdentifier>(relatedIdentifier: T): relatedIdentifier is Extract<T, { scheme: S }> =>
    relatedIdentifier.scheme === scheme

export const hasRelation =
  <R extends ZenodoRelatedIdentifier['relation']>(relation: R) =>
  <T extends ZenodoRelatedIdentifier>(relatedIdentifier: T): relatedIdentifier is T & { relation: R } =>
    relatedIdentifier.relation === relation
