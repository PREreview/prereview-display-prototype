import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { page } from '../page'
import { searchMatch } from '../router'
import { maybeDisplayReviews } from './display-reviews'
import { fetchDetails } from './fetch-details'

const createPage = flow(maybeDisplayReviews, reviews =>
  page(
    'Home',
    `
<main class="col-lg-6 mx-auto p-3 py-md-5">

  <header>

    <h1>PREreview</h1>

    <p class="fs-5 col-md-8">Catalyzing change in peer review through equity, openness, and collaboration

  </header>

  <hr class="col-3 col-md-2 mb-5">
  
  <form method="get" action="${format(searchMatch.formatter, {})}" class="row row-cols-lg-auto pb-5">
    <div class="col-12">
      <label class="visually-hidden" for="searchTerm">Search term</label>
      <input type="text" class="form-control" id="searchTerm" name="query">
    </div>
    <div class="col-12">
      <button type="submit" class="btn btn-primary">Find a preprint</button>
    </div>
  </form>

  <div>${reviews}</div>

</main>
`,
  ),
)

const sendPage = flow(createPage, M.send)

export const home = pipe(
  fetchDetails,
  RM.rightReaderTask,
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainMiddlewareK(sendPage),
)
