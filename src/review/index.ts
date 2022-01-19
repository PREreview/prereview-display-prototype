import * as doi from 'doi-ts'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { and } from 'fp-ts/Refinement'
import { constant, flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as orcid from 'orcid-ts'
import { Author, DoiData, fetchDoi } from '../fetch-doi'
import { ServiceUnavailable } from '../http-error'
import { PositiveInt } from '../number'
import { page } from '../page'
import * as S from '../string'
import { ZenodoRecord, getRecord, hasRelation, hasScheme } from '../zenodo'

type Details = {
  preprint: DoiData
  review: ZenodoRecord
}

const fetchDetails = flow(
  getRecord,
  RTE.bindTo('review'),
  RTE.bindW('preprint', ({ review }) =>
    pipe(
      review.metadata.related_identifiers,
      RA.findFirst(pipe(hasScheme('doi'), and(hasRelation('reviews')))),
      RTE.fromOption(() => new Error('Does not review')),
      RTE.chain(flow(foo => foo.identifier, fetchDoi)),
    ),
  ),
)

function displayReview(review: ZenodoRecord) {
  return `
<div class="card">
  <div class="card-body">
    <h5 class="card-title">${pipe(review.metadata.creators, displayAuthors)}</h5>
    <h6 class="card-subtitle mb-2 text-muted">${review.doi}</h6>
    <p class="card-text">${review.metadata.description}</p>
    <a href="${review.links.latest_html}">Read the full review</a>
  </div>
</div>
`
}

const displayNoAbstract = constant('<p>No abstract available</p>')
const maybeDisplayAbstract = O.getOrElse(displayNoAbstract)

function displayAuthor(author: Author): string {
  if (O.isSome(author.orcid)) {
    return `<a href="${pipe(author.orcid.value, orcid.toUrl)}" class="text-decoration-none link-dark">
      ${author.name}
      <img alt="ORCID logo" src="https://orcid.org/assets/vectors/orcid.logo.icon.svg" width="16" height="16" class="align-baseline">
    </a>`
  }

  return author.name
}

const displayNoAuthors = constant('Unknown')
const displayAuthors = flow(RNEA.map(displayAuthor), S.join(', '))
const maybeDisplayAuthors = RA.match(displayNoAuthors, displayAuthors)

function createPage({ preprint, review }: Details) {
  return page(
    preprint.title,
    `
<main class="container-fluid px-5">

  <div class="row gx-5">

  <div class="col-6 pt-5 pb-5">
  
    <header>
  
      <h1>${preprint.title}</h1>
  
    </header>
  
    <div>${maybeDisplayAbstract(preprint.abstract)}</div>
  
    <a href="${pipe(preprint.doi, doi.toUrl)}" class="mt-2">Read full text</a>
  
  </div>

  <div class="col-6 pt-5 pb-5">

    <dl class="row">
     <dt class="col-sm-2">Authors
     <dd class="col-sm-10">${pipe(preprint.authors, maybeDisplayAuthors)}
     <dt class="col-sm-2">Published
     <dd class="col-sm-10"><time>${pipe(
       preprint.published,
       O.match(constant(S.empty), date => date.toDateString()),
     )}</time>
     <dt class="col-sm-2">DOI
     <dd class="col-sm-10">${preprint.doi}
    </dl>

    <hr class="mt-5 mb-5">

    <h2>Review</h2>

    ${pipe(review, displayReview)}

  </div>

  </div>

</main>
`,
  )
}

const sendPage = flow(createPage, M.send)

export const review = (id: PositiveInt) =>
  pipe(
    fetchDetails(id),
    RM.fromReaderTaskEither,
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
    RM.ichainFirst(() => RM.closeHeaders()),
    RM.ichainMiddlewareKW(sendPage),
    RM.orElseW(flow(ServiceUnavailable, RM.fromMiddleware)),
  )
