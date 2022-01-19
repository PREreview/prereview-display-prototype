import { flow, pipe } from 'fp-ts/function'
import http from 'http'
import createHttpError, { HttpError, UnknownError } from 'http-errors'
import * as H from 'hyper-ts'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import { page } from './page'

export const toHttpError =
  <N extends H.Status>(statusCode: N) =>
  (error: UnknownError): HttpError<N> =>
    createHttpError(statusCode as any, error) // TODO why is any needed?

export const toServiceUnavailableError = toHttpError(Status.ServiceUnavailable)

export function handleError<N extends H.Status>(error: HttpError<N>) {
  return pipe(
    M.status(error.status),
    M.ichain(() => M.header('cache-control', 'no-store, must-revalidate')),
    M.ichain(() => M.contentType(MediaType.textHTML)),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => pipe(http.STATUS_CODES[error.status] ?? 'Error', errorPage, M.send)),
  )
}

export const ServiceUnavailable = handlePlainError(Status.ServiceUnavailable)

function handlePlainError<N extends H.Status>(statusCode: N) {
  return flow(toHttpError(statusCode), handleError)
}

function errorPage(title: string) {
  return page(
    title,
    `

<main class="col-lg-8 mx-auto p-3 py-md-5">

  <header>

    <h1>${title}</h1>

  </header>

</main>  
`,
  )
}
