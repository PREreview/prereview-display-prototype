import { Response } from 'fetch-fp-ts'
import { JsonRecord } from 'fp-ts/Json'
import { pipe } from 'fp-ts/function'
import * as d from './decoder'
import * as e from './encoder'

type JsonRecordEncoder<A> = e.Encoder<JsonRecord, A>

const ResponseE: JsonRecordEncoder<Response> = e.fromFunction(response => ({
  status: response.status,
  statusText: response.statusText,
  url: response.url,
}))

const ErrorE: JsonRecordEncoder<Error> = e.fromFunction(error => ({
  error: error.message,
}))

const DecodeErrorE: JsonRecordEncoder<d.DecodeError> = e.fromFunction(error => ({
  errors: pipe(error, d.draw),
}))

export function errorToJson<T extends Error | Response | d.DecodeError>(error: T): JsonRecord {
  if (error instanceof Error) {
    return ErrorE.encode(error)
  }

  if ('_tag' in error) {
    return DecodeErrorE.encode(error)
  }

  return ResponseE.encode(error)
}
