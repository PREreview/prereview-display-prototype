import { ResponseError } from 'fetch-fp-ts'
import { JsonRecord } from 'fp-ts/Json'
import { pipe } from 'fp-ts/function'
import * as d from './decoder'
import * as e from './encoder'

type JsonRecordEncoder<A> = e.Encoder<JsonRecord, A>

const ResponseErrorE: JsonRecordEncoder<ResponseError> = e.fromFunction(error => ({
  message: error.message,
  status: error.response.status,
  url: error.response.url,
}))

const ErrorE: JsonRecordEncoder<Error> = e.fromFunction(error => ({
  error: error.message,
}))

const DecodeErrorE: JsonRecordEncoder<d.DecodeError> = e.fromFunction(error => ({
  errors: pipe(error, d.draw),
}))

export function errorToJson<T extends Error | d.DecodeError>(error: T): JsonRecord {
  if (error instanceof ResponseError) {
    return ResponseErrorE.encode(error)
  }

  if (error instanceof Error) {
    return ErrorE.encode(error)
  }

  return DecodeErrorE.encode(error)
}
