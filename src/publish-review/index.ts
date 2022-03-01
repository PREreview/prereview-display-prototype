import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { constant, flow, pipe } from 'fp-ts/function'
import { BadRequest } from 'http-errors'
import { Method, parse } from 'http-methods-ts'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as FS from 'io-ts/FreeSemigroup'
import { match } from 'ts-pattern'
import * as d from '../decoder'
import { DoiData, fetchDoi } from '../fetch-doi'
import { ServiceUnavailable, handleError } from '../http-error'
import { page } from '../page'
import { reviewMatch } from '../router'
import * as S from '../string'
import { User, getUser } from '../user'
import { SubmittedDeposition } from '../zenodo'
import { NewReviewD } from './new-review'
import { publishReviewOnZenodo } from './publish-review-on-zenodo'

const showError: (error: d.DecodeError) => RNEA.ReadonlyNonEmptyArray<string> = FS.fold(
  value => {
    if (value._tag === 'Key') {
      return [`${value.key} is ${value.kind}`]
    }
    return [`${value._tag}`]
  },
  (left, right) => pipe(showError(right), RNEA.concat(showError(left))),
)

const toListItem = S.prepend('<li>')

const toList: (items: RNEA.ReadonlyNonEmptyArray<string>) => string = flow(
  RNEA.map(toListItem),
  S.join(S.empty),
  S.prepend('<ol>'),
  S.append('</ol>'),
)

const showErrors = flow(
  showError,
  toList,
  S.prepend('<div class="alert alert-warning" role="alert"><h2>Errors</h2>'),
  S.append('</div>'),
)

const maybeShowErrors = O.match(constant(S.empty), showErrors)

function createPage({ preprint, errors, user }: { preprint: DoiData; errors: O.Option<d.DecodeError>; user: User }) {
  return page(
    `Add a PREreview of ${preprint.title}`,
    `
<main class="container">

  <header class="py-5 text-center">

    <h1>Add a PREreview</h1>

    <p class="lead">${preprint.title}</p>

  </header>

  <form method="post">

    ${maybeShowErrors(errors)}

    <input type="hidden" name="preprint" value="${preprint.doi}">

    <div class="row g-3 mb-3 align-items-center">

      <div class="col-auto">
        <label for="name" class="col-form-label">Name</label>
      </div>
      <div class="col-auto">
        <input type="text" class="form-control" id="name" name="name" value="${user.name}">
      </div>
    </div>

    <div class="mb-3 mb-5">
      <label for="content" class="form-label">Content</label>
      <textarea class="form-control" id="content" name="content"></textarea>
    </div>
    
    <button type="submit" class="btn btn-primary">Submit</button>
  </form>

</main>
`,
  )
}

const onMethod = (doi: Doi) => (method: Method) =>
  match(method)
    .with('POST', () => handlePublishReview(doi))
    .otherwise(() => publishReviewForm(doi))

export const publishReview = (doi: Doi) =>
  pipe(RM.decodeMethod(parse(constant(new BadRequest()))), RM.ichainW(onMethod(doi)), RM.orElseMiddlewareK(handleError))

export const publishReviewForm = flow(
  RM.fromReaderTaskEitherK(fetchDoi),
  RM.bindTo('preprint'),
  RM.apSW('errors', pipe(O.none, RM.right)),
  RM.apSW('user', pipe(getUser, RM.chainEitherK(E.fromOption(() => new Error('No user'))))),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainMiddlewareKW(flow(createPage, M.send)),
  RM.orElseMiddlewareK(ServiceUnavailable),
)

export const publishReviewErrorForm = (doi: Doi) => (errors: d.DecodeError) =>
  pipe(
    doi,
    RM.fromReaderTaskEitherK(fetchDoi),
    RM.bindTo('preprint'),
    RM.apSW('errors', pipe(errors, O.some, RM.right)),
    RM.apSW('user', pipe(getUser, RM.chainEitherK(E.fromOption(() => new Error('No user'))))),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
    RM.ichainFirst(() => RM.closeHeaders()),
    RM.ichainMiddlewareKW(flow(createPage, M.send)),
    RM.orElseMiddlewareK(ServiceUnavailable),
  )

const goAndPublish = flow(
  RM.fromReaderTaskEitherK(publishReviewOnZenodo),
  RM.map(createDepositionUrl),
  RM.ichainW(RM.redirect),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
  RM.orElseMiddlewareK(handleError),
)

export const handlePublishReview = (doi: Doi) =>
  pipe(RM.decodeBody(NewReviewD.decode), RM.ichainW(goAndPublish), RM.orElseW(publishReviewErrorForm(doi)))

function createDepositionUrl(deposition: SubmittedDeposition) {
  return format(reviewMatch.formatter, { id: deposition.id })
}
