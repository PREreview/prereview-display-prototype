import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
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

function createPage({ preprint, errors }: { preprint: DoiData; errors: O.Option<d.DecodeError> }) {
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
        <input type="text" class="form-control" id="name" name="name">
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
  pipe(
    RM.decodeMethod(parse(constant(new BadRequest()))),
    RM.ichainW(onMethod(doi)),
    RM.orElseW(flow(handleError, RM.fromMiddleware)),
  )

export const publishReviewForm = (doi: Doi) =>
  pipe(
    fetchDoi(doi),
    RTE.bindTo('preprint'),
    RTE.apSW('errors', pipe(O.none, RTE.right)),
    RM.fromReaderTaskEither,
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
    RM.ichainFirst(() => RM.closeHeaders()),
    RM.ichainMiddlewareKW(flow(createPage, M.send)),
    RM.orElseW(flow(ServiceUnavailable, RM.fromMiddleware)),
  )

export const publishReviewErrorForm = (doi: Doi) => (errors: d.DecodeError) =>
  pipe(
    RTE.Do,
    RTE.apS('errors', pipe(errors, O.some, RTE.right)),
    RTE.apS('preprint', pipe(doi, fetchDoi)),
    RM.fromReaderTaskEither,
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
    RM.ichainFirst(() => RM.closeHeaders()),
    RM.ichainMiddlewareKW(flow(createPage, M.send)),
    RM.orElseW(flow(ServiceUnavailable, RM.fromMiddleware)),
  )

const goAndPublish = flow(
  publishReviewOnZenodo,
  RM.fromReaderTaskEither,
  RM.map(createDepositionUrl),
  RM.ichainW(RM.redirect),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
  RM.orElseW(flow(handleError, RM.fromMiddleware)),
)

export const handlePublishReview = (doi: Doi) =>
  pipe(RM.decodeBody(NewReviewD.decode), RM.ichainW(goAndPublish), RM.orElseW(publishReviewErrorForm(doi)))

function createDepositionUrl(deposition: SubmittedDeposition) {
  return format(reviewMatch.formatter, { id: deposition.id })
}
