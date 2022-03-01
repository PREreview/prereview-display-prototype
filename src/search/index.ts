import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { constant, flow, pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { Author, EuropePmcRecord, searchFor } from '../europe-pmc'
import { header } from '../header'
import { ServiceUnavailable } from '../http-error'
import { page } from '../page'
import { preprintMatch, searchMatch } from '../router'
import * as S from '../string'
import { User, getUser } from '../user'

type Details = {
  query: string
  results: ReadonlyArray<EuropePmcRecord>
  user: O.Option<User>
}

function displayResult(result: EuropePmcRecord) {
  return `
<a href="${format(preprintMatch.formatter, { doi: result.doi })}" class="list-group-item list-group-item-action p-4">
  <h5 class="">${result.title}</h5>
  <h6 class="mb-2 text-muted">${result.doi}</h6>
  <p class="mb-0">${pipe(result.authorList.author, displayAuthors)}</p>
</a>
`
}

const displayResults = flow(
  RNEA.map(displayResult),
  S.join(S.empty),
  S.prepend('<div class="list-group">'),
  S.append('</div>'),
)
const displayNoResults = constant('<p>No results found</p>')
const maybeDisplayResults = RA.match(displayNoResults, displayResults)

function displayAuthor(author: Author): string {
  return 'firstName' in author ? `${author.firstName} ${author.lastName}` : author.collectiveName
}

const displayAuthors = flow(RNEA.map(displayAuthor), S.join(', '))

function createPage({ query, results, user }: Details) {
  return page(
    'Search results',
    `
${header(user)}

<main class="col-lg-6 mx-auto p-3 py-md-5">

  <header>

    <h1>Search results</h1>

  </header>

  <hr class="col-3 col-md-2 mb-5">

  <form method="get" action="${format(searchMatch.formatter, {})}" class="row row-cols-lg-auto pb-5">
    <div class="col-12">
      <label class="visually-hidden" for="searchTerm">Search term</label>
      <input type="text" class="form-control" id="searchTerm" name="query" value="${query}">
    </div>
    <div class="col-12">
      <button type="submit" class="btn btn-primary">Find a preprint</button>
    </div>
  </form>

  <div>${maybeDisplayResults(results)}</div>

</main>
`,
  )
}

const sendPage = flow(createPage, M.send)

const fetchDetails = (query: string) =>
  pipe(RTE.Do, RTE.apS('query', RTE.right(query)), RTE.apS('results', pipe(query, searchFor)))

export const search = flow(
  RM.fromReaderTaskEitherK(fetchDetails),
  RM.apSW('user', getUser),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType(MediaType.textHTML)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainMiddlewareKW(sendPage),
  RM.orElseMiddlewareK(ServiceUnavailable),
)
