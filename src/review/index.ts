import * as doi from 'doi-ts'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { and } from 'fp-ts/Refinement'
import { intercalate } from 'fp-ts/Semigroup'
import * as B from 'fp-ts/boolean'
import { constant, flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as orcid from 'orcid-ts'
import { Author, DoiData, fetchDoi } from '../fetch-doi'
import { header } from '../header'
import { ServiceUnavailable } from '../http-error'
import { PositiveInt } from '../number'
import { page } from '../page'
import * as S from '../string'
import { User, getUser } from '../user'
import { ZenodoRecord, getRecord, hasRelation, hasScheme } from '../zenodo'

type Details = {
  preprint: DoiData
  review: ZenodoRecord
  user: O.Option<User>
}

const fetchDetails = flow(
  getRecord,
  RTE.bindTo('review'),
  RTE.bindW(
    'preprint',
    flow(
      ({ review }) => review.metadata.related_identifiers,
      RTE.fromOptionK(() => new Error('Does not review'))(
        RA.findFirst(pipe(hasScheme('doi'), and(hasRelation('reviews')))),
      ),
      RTE.chain(flow(foo => foo.identifier, fetchDoi)),
    ),
  ),
)

function displayFullReview(review: ZenodoRecord) {
  return `
<div class="card">
  <div class="card-body">
    <h5 class="card-title">${pipe(review.metadata.creators, displayAuthors)}</h5>
    <h6 class="card-subtitle mb-2 text-muted">${review.doi}</h6>
    <div class="card-text">
      ${review.metadata.description}
    </div>
    <a href="${review.links.latest_html}">Read the review on Zenodo</a>
  </div>
</div>
`
}

function displayRapidReview(review: ZenodoRecord) {
  return `
<div class="card">
  <div class="card-body">
    <h5 class="card-title"><span class="badge bg-secondary">Rapid Review</span> ${pipe(
      review.metadata.creators,
      displayAuthors,
    )}</h5>
    <h6 class="card-subtitle mb-2 text-muted">${review.doi}</h6>
    <div class="card-text">
      ${review.metadata.description}
    </div>
    <a href="${review.links.latest_html}">Read the review on Zenodo</a>
  </div>
</div>
`
}

function isARapidReview(review: ZenodoRecord) {
  return pipe(review.metadata.keywords, O.filter(RA.elem(S.Eq)('rapid-review')), O.isSome)
}

function displayReview(review: ZenodoRecord) {
  return pipe(
    review,
    isARapidReview,
    B.match(
      () => displayFullReview(review),
      () => displayRapidReview(review),
    ),
  )
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
const displayAuthors = RNEA.foldMap(pipe(S.Semigroup, intercalate(', ')))(displayAuthor)
const maybeDisplayAuthors = RA.match(displayNoAuthors, displayAuthors)

function createPage({ preprint, review, user }: Details) {
  return page(
    preprint.title,
    `
${header(user)}

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

export const review = flow(
  RM.fromReaderTaskEitherK(fetchDetails),
  RM.apSW('user', getUser),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainMiddlewareKW(sendPage),
  RM.orElseMiddlewareK(ServiceUnavailable),
)
