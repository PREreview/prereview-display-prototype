import * as RIO from 'fp-ts-contrib/ReaderIO'
import * as IO from 'fp-ts/IO'
import * as S from 'fp-ts/Show'
import { apply, constant, flow, pipe } from 'fp-ts/function'
import * as L from 'logging-ts/lib/IO'
import * as D from './date'
import * as Json from './json'

export type Logger = L.LoggerIO<LogEntry>

export type LoggerEnv = {
  logger: Logger
}

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
  readonly message: string
  readonly date: Date
  readonly level: LogLevel
  readonly payload: Json.JsonRecord
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const LogEntry = (message: string, date: Date, level: LogLevel, payload: Json.JsonRecord): LogEntry => ({
  message,
  date,
  level,
  payload,
})

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const logWithLevel = (level: LogLevel) => (message: string) => (payload: Json.JsonRecord) =>
  pipe(
    RIO.ask<LoggerEnv>(),
    RIO.chainIOK(({ logger }) =>
      pipe(
        D.create,
        IO.chain(date => pipe(LogEntry(message, date, level, payload), logger)),
      ),
    ),
  )

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const showEntry: S.Show<LogEntry> = {
  show: ({ message, date, level, payload }) =>
    `${D.Show.show(date)} | ${level} | ${message}${
      Object.keys(payload).length > 0 ? ` | ${Json.Show.show(payload)}` : ''
    }`,
}

export const debugP = logWithLevel('DEBUG')

export const debug = flow(debugP, apply({}))

export const infoP = logWithLevel('INFO')

export const info = flow(infoP, apply({}))

export const warnP = logWithLevel('WARN')

export const warn = flow(warnP, apply({}))

export const errorP = logWithLevel('ERROR')

export const error = flow(errorP, apply({}))

export const withShow =
  (show: S.Show<LogEntry>) =>
  (logger: L.LoggerIO<string>): Logger =>
    flow(entry => show.show(entry), logger)

export const withJson = withShow(Json.Show as unknown as S.Show<LogEntry>)

export const withPayload =
  (attacher: (payload: Json.JsonRecord) => Json.JsonRecord) =>
  (logger: Logger): Logger =>
    flow(entry => ({ ...entry, payload: attacher(entry.payload) }), logger)
