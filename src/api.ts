import { BodyError, getJson } from 'fetch-fp-ts'
import { Json } from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as l from 'logger-ts'
import * as d from './decoder'
import { errorToJson } from './errors'

export type DecoderError = BodyError | d.DecodeError
export type Decoder<A> = (response: Response) => RTE.ReaderTaskEither<l.LoggerEnv, DecoderError, A>

export const logError =
  (message: string) =>
  <E extends Error | d.DecodeError>(error: E) =>
    pipe(RTE.ask<l.LoggerEnv>(), RTE.chainIOK(pipe(error, errorToJson, l.errorP(message))))

export function decode<A>(decoder: d.Decoder<Json, A>, message: string): Decoder<A> {
  return flow(getJson, TE.chainEitherKW(decoder.decode), RTE.fromTaskEither, RTE.orElseFirst(logError(message)))
}
