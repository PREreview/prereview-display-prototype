import * as E from 'fp-ts/Either'

export class ResponseError extends Error {
  name!: 'ResponseError'

  constructor(readonly response: Response) {
    super(response.statusText)
  }

  static fromResponse(response: Response) {
    return new ResponseError(response)
  }
}

export function isOk(response: Response): boolean {
  return response.ok
}

export const ensureSuccess: (response: Response) => E.Either<ResponseError, Response> = E.fromPredicate(
  isOk,
  ResponseError.fromResponse,
)
