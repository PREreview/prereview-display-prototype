import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { Request } from './request'

export type FetchEnv = {
  fetch: (input: string, init: RequestInit) => Promise<Response>
}

export class NetworkError extends Error {
  name!: 'NetworkError'
}

export const send: (request: Request) => RTE.ReaderTaskEither<FetchEnv, NetworkError, Response> = ([url, init]) =>
  pipe(
    RTE.ask<FetchEnv>(),
    RTE.chainTaskEitherK(({ fetch }) => TE.tryCatch(() => fetch(url.href, init), toNetworkError)),
  )

function toNetworkError(error: unknown): NetworkError {
  if (error instanceof NetworkError) {
    return error
  }

  if (error instanceof Error) {
    return new NetworkError(error.message)
  }

  return new NetworkError(String(error))
}
