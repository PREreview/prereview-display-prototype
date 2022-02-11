import chalk from 'chalk'
import * as RIO from 'fp-ts-contrib/ReaderIO'
import * as IO from 'fp-ts/IO'
import * as S from 'fp-ts/Show'
import { apply, flow, pipe } from 'fp-ts/function'
import * as L from 'logging-ts/lib/IO'
import * as D from './date'
import * as Json from './json'

export type LoggerEnv = {
  logger: L.LoggerIO<LogEntry>
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
// destructors
// -------------------------------------------------------------------------------------

const match =
  <R>(patterns: {
    readonly [K in LogLevel]: (entry: LogEntry) => R
  }) =>
  (entry: LogEntry) => {
    return patterns[entry.level](entry)
  }

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

export const withColor = (f: (a: LogEntry) => string) =>
  match({
    DEBUG: flow(f, chalk.cyan),
    INFO: flow(f, chalk.magenta),
    WARN: flow(f, chalk.yellow),
    ERROR: flow(f, chalk.red),
  })

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
