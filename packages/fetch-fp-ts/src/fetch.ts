import crossFetch, { Response } from 'cross-fetch'
import * as TE from 'fp-ts/TaskEither'

export type FetchEnv = {
  fetch: Fetch
}

export type Fetch = (request: RequestInfo | URL, init?: RequestInit) => TE.TaskEither<NetworkError, Response>

export class NetworkError extends Error {
  name!: 'NetworkError'
}

export const fetch: Fetch = TE.tryCatchK(crossFetch as any, toNetworkError)

function toNetworkError(error: unknown): NetworkError {
  if (error instanceof NetworkError) {
    return error
  }

  if (error instanceof Error) {
    return new NetworkError(error.message)
  }

  return new NetworkError(String(error))
}
