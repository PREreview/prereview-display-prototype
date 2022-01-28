import * as E from 'fp-ts/Either'
import { Json, parse } from 'fp-ts/Json'
import * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/function'

export class BodyError extends Error {
  name!: 'BodyError'
}

export const getText = TE.tryCatchK(<T extends Body>(message: T) => message.text(), toBodyError)

export const getJson: <T extends Body>(message: T) => TE.TaskEither<BodyError, Json> = flow(
  getText,
  TE.chainEitherKW(flow(parse, E.mapLeft(toBodyError))),
)

function toBodyError(error: unknown): BodyError {
  if (error instanceof BodyError) {
    return error
  }

  if (error instanceof Error) {
    return new BodyError(error.message)
  }

  return new BodyError(String(error))
}
