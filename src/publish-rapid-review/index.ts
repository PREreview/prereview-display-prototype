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
import { NewRapidReviewD } from './new-rapid-review'
import { publishRapidReviewOnZenodo } from './publish-rapid-review-on-zenodo'

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
    `Add a rapid review of ${preprint.title}`,
    `
<main class='container'>

  <header class='py-5 text-center'>

    <h1>Add a rapid review</h1>

    <p class='lead'>${preprint.title}</p>

  </header>

  <form method='post'>

    ${maybeShowErrors(errors)}

    <input type='hidden' name='preprint' value='${preprint.doi}'>

    <div class='row g-3 mb-3 align-items-center'>

      <div class='col-auto'>
        <label for='name' class='col-form-label'>Name</label>
      </div>
      <div class='col-auto'>
        <input type='text' class='form-control' id='name' name='name' value='${user.name}'>
      </div>
    </div>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Are the findings novel?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='novel' id='novel-yes' value='Yes'>
      <label class='btn btn-outline-success' for='novel-yes'>Yes</label>
      <input type='radio' class='btn-check' name='novel' id='novel-no' value='No'>
      <label class='btn btn-outline-danger' for='novel-no'>No</label>
      <input type='radio' class='btn-check' name='novel' id='novel-na' value='N/A'>
      <label class='btn btn-outline-dark' for='novel-na'>N/A</label>
      <input type='radio' class='btn-check' name='novel' id='novel-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='novel-unsure'>Unsure</label>
      </div>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Are the results likely to lead to future research?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='future' id='future-yes' value='Yes'>
      <label class='btn btn-outline-success' for='future-yes'>Yes</label>
      <input type='radio' class='btn-check' name='future' id='future-no' value='No'>
      <label class='btn btn-outline-danger' for='future-no'>No</label>
      <input type='radio' class='btn-check' name='future' id='future-na' value='N/A'>
      <label class='btn btn-outline-dark' for='future-na'>N/A</label>
      <input type='radio' class='btn-check' name='future' id='future-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='future-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Is sufficient detail provided to allow reproduction of the study?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='replication' id='replication-yes' value='Yes'>
      <label class='btn btn-outline-success' for='replication-yes'>Yes</label>
      <input type='radio' class='btn-check' name='replication' id='replication-no' value='No'>
      <label class='btn btn-outline-danger' for='replication-no'>No</label>
      <input type='radio' class='btn-check' name='replication' id='replication-na' value='N/A'>
      <label class='btn btn-outline-dark' for='replication-na'>N/A</label>
      <input type='radio' class='btn-check' name='replication' id='replication-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='replication-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Are the methods and statistics appropriate for the analysis?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='methods' id='methods-yes' value='Yes'>
      <label class='btn btn-outline-success' for='methods-yes'>Yes</label>
      <input type='radio' class='btn-check' name='methods' id='methods-no' value='No'>
      <label class='btn btn-outline-danger' for='methods-no'>No</label>
      <input type='radio' class='btn-check' name='methods' id='methods-na' value='N/A'>
      <label class='btn btn-outline-dark' for='methods-na'>N/A</label>
      <input type='radio' class='btn-check' name='methods' id='methods-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='methods-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Are the principal conclusions supported by the data and analysis?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='conclusions' id='conclusions-yes' value='Yes'>
      <label class='btn btn-outline-success' for='conclusions-yes'>Yes</label>
      <input type='radio' class='btn-check' name='conclusions' id='conclusions-no' value='No'>
      <label class='btn btn-outline-danger' for='conclusions-no'>No</label>
      <input type='radio' class='btn-check' name='conclusions' id='conclusions-na' value='N/A'>
      <label class='btn btn-outline-dark' for='conclusions-na'>N/A</label>
      <input type='radio' class='btn-check' name='conclusions' id='conclusions-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='conclusions-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Does the manuscript discuss limitations?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='limitations' id='limitations-yes' value='Yes'>
      <label class='btn btn-outline-success' for='limitations-yes'>Yes</label>
      <input type='radio' class='btn-check' name='limitations' id='limitations-no' value='No'>
      <label class='btn btn-outline-danger' for='limitations-no'>No</label>
      <input type='radio' class='btn-check' name='limitations' id='limitations-na' value='N/A'>
      <label class='btn btn-outline-dark' for='limitations-na'>N/A</label>
      <input type='radio' class='btn-check' name='limitations' id='limitations-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='limitations-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Have the authors adequately discussed ethical concerns?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='ethical' id='ethical-yes' value='Yes'>
      <label class='btn btn-outline-success' for='ethical-yes'>Yes</label>
      <input type='radio' class='btn-check' name='ethical' id='ethical-no' value='No'>
      <label class='btn btn-outline-danger' for='ethical-no'>No</label>
      <input type='radio' class='btn-check' name='ethical' id='ethical-na' value='N/A'>
      <label class='btn btn-outline-dark' for='ethical-na'>N/A</label>
      <input type='radio' class='btn-check' name='ethical' id='ethical-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='ethical-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Does the manuscript include new data?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='data' id='data-yes' value='Yes'>
      <label class='btn btn-outline-success' for='data-yes'>Yes</label>
      <input type='radio' class='btn-check' name='data' id='data-no' value='No'>
      <label class='btn btn-outline-danger' for='data-no'>No</label>
      <input type='radio' class='btn-check' name='data' id='data-na' value='N/A'>
      <label class='btn btn-outline-dark' for='data-na'>N/A</label>
      <input type='radio' class='btn-check' name='data' id='data-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='data-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Are the data used in the manuscript available?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='available' id='available-yes' value='Yes'>
      <label class='btn btn-outline-success' for='available-yes'>Yes</label>
      <input type='radio' class='btn-check' name='available' id='available-no' value='No'>
      <label class='btn btn-outline-danger' for='available-no'>No</label>
      <input type='radio' class='btn-check' name='available' id='available-na' value='N/A'>
      <label class='btn btn-outline-dark' for='available-na'>N/A</label>
      <input type='radio' class='btn-check' name='available' id='available-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='available-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Is the code used in the manuscript available?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='code' id='code-yes' value='Yes'>
      <label class='btn btn-outline-success' for='code-yes'>Yes</label>
      <input type='radio' class='btn-check' name='code' id='code-no' value='No'>
      <label class='btn btn-outline-danger' for='code-no'>No</label>
      <input type='radio' class='btn-check' name='code' id='code-na' value='N/A'>
      <label class='btn btn-outline-dark' for='code-na'>N/A</label>
      <input type='radio' class='btn-check' name='code' id='code-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='code-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Would you recommend this manuscript to others?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='manuscript' id='manuscript-yes' value='Yes'>
      <label class='btn btn-outline-success' for='manuscript-yes'>Yes</label>
      <input type='radio' class='btn-check' name='manuscript' id='manuscript-no' value='No'>
      <label class='btn btn-outline-danger' for='manuscript-no'>No</label>
      <input type='radio' class='btn-check' name='manuscript' id='manuscript-na' value='N/A'>
      <label class='btn btn-outline-dark' for='manuscript-na'>N/A</label>
      <input type='radio' class='btn-check' name='manuscript' id='manuscript-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='manuscript-unsure'>Unsure</label>
      </div>
    </fieldset>

    <fieldset class='row mb-5'>
      <legend class='col-form-label col-sm-2 pt-0'>Do you recommend this manuscript for peer review?</legend>
      <div class='col-sm-10'>
      <input type='radio' class='btn-check' name='review' id='review-yes' value='Yes'>
      <label class='btn btn-outline-success' for='review-yes'>Yes</label>
      <input type='radio' class='btn-check' name='review' id='review-no' value='No'>
      <label class='btn btn-outline-danger' for='review-no'>No</label>
      <input type='radio' class='btn-check' name='review' id='review-na' value='N/A'>
      <label class='btn btn-outline-dark' for='review-na'>N/A</label>
      <input type='radio' class='btn-check' name='review' id='review-unsure' value='Unsure'>
      <label class='btn btn-outline-secondary' for='review-unsure'>Unsure</label>
      </div>
    </fieldset>

    <button type='submit' class='btn btn-primary'>Submit</button>
  </form>

</main>
`,
  )
}

const onMethod = (doi: Doi) => (method: Method) =>
  match(method)
    .with('POST', () => handlePublishReview(doi))
    .otherwise(() => publishReviewForm(doi))

export const publishRapidReview = (doi: Doi) =>
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
  RM.fromReaderTaskEitherK(publishRapidReviewOnZenodo),
  RM.map(createDepositionUrl),
  RM.ichainW(RM.redirect),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
  RM.orElseMiddlewareK(handleError),
)

export const handlePublishReview = (doi: Doi) =>
  pipe(RM.decodeBody(NewRapidReviewD.decode), RM.ichainW(goAndPublish), RM.orElseW(publishReviewErrorForm(doi)))

function createDepositionUrl(deposition: SubmittedDeposition) {
  return format(reviewMatch.formatter, { id: deposition.id })
}
