import * as doi from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { constant, flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { DoiData } from '../fetch-doi'
import { ServiceUnavailable } from '../http-error'
import { page } from '../page'
import { publishReviewMatch } from '../router'
import * as S from '../string'
import { ZenodoRecord } from '../zenodo'
import { maybeDisplayAbstract } from './display-abstract'
import { maybeDisplayAuthors } from './display-authors'
import { maybeDisplayReviews } from './display-reviews'
import { fetchDetails } from './fetch-details'

export const preprint = (doi: doi.Doi) =>
  pipe(
    fetchDetails(doi),
    RM.fromReaderTaskEither,
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
    RM.ichainFirst(() => RM.closeHeaders()),
    RM.ichainMiddlewareKW(sendPage),
    RM.orElseW(flow(ServiceUnavailable, RM.fromMiddleware)),
  )

type Details = {
  preprint: DoiData
  reviews: ReadonlyArray<ZenodoRecord>
}

const sendPage = flow(createPage, M.send)

function createPage({ preprint, reviews }: Details) {
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

    <h2>Full PREreviews</h2>

    ${maybeDisplayReviews(reviews)}
    
    <a href="${format(publishReviewMatch.formatter, { doi: preprint.doi })}" class="btn btn-primary mt-5">
      Add PREreview
    </a>
    
  </div>

  </div>

</main>
`,
  )
}
