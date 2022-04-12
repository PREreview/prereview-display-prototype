import * as F from 'fetch-fp-ts'
import * as RTEC from 'fp-ts-contrib/ReaderTaskEither'
import { Json } from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as l from 'logger-fp-ts'
import * as d from './decoder'
import { errorToJson } from './errors'

type Decoder<A> = (response: F.Response) => RTE.ReaderTaskEither<l.LoggerEnv, Error | d.DecodeError, A>

export const logError = (message: string) => RTEC.fromReaderIOK(flow(errorToJson, l.errorP(message)))

export function decode<A>(decoder: d.Decoder<Json, A>, message: string): Decoder<A> {
  return flow(RTE.fromTaskEitherK(F.decode(pipe(d.json, d.compose(decoder)))), RTE.orElseFirst(logError(message)))
}
