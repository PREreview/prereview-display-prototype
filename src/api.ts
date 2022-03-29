import { BodyError, getJson } from 'fetch-fp-ts'
import * as RTEC from 'fp-ts-contrib/ReaderTaskEither'
import { Json } from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow } from 'fp-ts/function'
import * as l from 'logger-fp-ts'
import * as d from './decoder'
import { errorToJson } from './errors'

export type DecoderError = BodyError | d.DecodeError
export type Decoder<A> = (response: Response) => RTE.ReaderTaskEither<l.LoggerEnv, DecoderError, A>

export const logError = (message: string) => RTEC.fromReaderIOK(flow(errorToJson, l.errorP(message)))

export function decode<A>(decoder: d.Decoder<Json, A>, message: string): Decoder<A> {
  return flow(RTE.fromTaskEitherK(getJson), RTE.chainEitherKW(decoder.decode), RTE.orElseFirst(logError(message)))
}
