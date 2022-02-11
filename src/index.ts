import { createTerminus } from '@godaddy/terminus'
import rTracer from 'cls-rtracer'
import 'dotenv/config'
import express from 'express'
import { FetchEnv } from 'fetch-fp-ts'
import * as C from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as IOE from 'fp-ts/IOEither'
import { JsonRecord } from 'fp-ts/Json'
import * as O from 'fp-ts/Option'
import { absurd, constant, flow, pipe } from 'fp-ts/function'
import http from 'http'
import { toRequestHandler } from 'hyper-ts/lib/express'
import * as LE from 'logger-ts'
import * as L from 'logging-ts/lib/IO'
import nodeFetch from 'node-fetch'
import { appMiddleware } from './app'
import * as d from './decoder'
import { EnvD } from './env'
import * as s from './string'
import { ZenodoEnv } from './zenodo'

type AppEnv = FetchEnv & LE.LoggerEnv & ZenodoEnv

function getRequestId() {
  return pipe(rTracer.id(), O.fromPredicate(s.isString))
}

const withRequestId = (entry: LE.LogEntry) =>
  pipe(
    getRequestId(),
    O.match(constant(entry), requestId => ({ ...entry, payload: { ...entry.payload, requestId } })),
  )

const logger = pipe(C.log, L.contramap(LE.withColor(LE.showEntry.show)))

const env = pipe(
  process.env,
  EnvD.decode,
  IOE.fromEither,
  IOE.orElseFirst(
    flow(
      d.draw,
      s.prepend('Unable to read environment variables:\n'),
      C.log,
      IO.chainFirst(() => process.exit(1)),
      IOE.rightIO,
    ),
  ),
  IOE.getOrElse(absurd as any),
)()

const deps: AppEnv = {
  fetch: nodeFetch as any,
  logger: pipe(logger, L.contramap(withRequestId)),
  zenodoApiKey: env.ZENODO_API_KEY,
}

const app = express()
  .disable('x-powered-by')
  .use(rTracer.expressMiddleware())
  .use((req, res, next) => {
    pipe({ method: req.method, url: req.url }, LE.infoP('Received HTTP request'))(deps)()

    res.once('finish', () => {
      pipe({ status: res.statusCode }, LE.infoP('Sent HTTP response'))(deps)()
    })

    res.once('close', () => {
      if (res.writableFinished) {
        return
      }

      pipe({ status: res.statusCode }, LE.warnP('HTTP response may not have been completely sent'))(deps)()
    })

    next()
  })
  .use(express.urlencoded({ extended: true }))
  .use(pipe(deps, appMiddleware, toRequestHandler))

const server = http.createServer(app)

server.on('listening', () => {
  pipe(server.address() as unknown as JsonRecord, LE.debugP('Server listening'))(deps)()
})

createTerminus(server, {
  onShutdown: async () => {
    LE.debug('Shutting server down')(deps)()
  },
  onSignal: async () => {
    LE.debug('Signal received')(deps)()
  },
  signals: ['SIGINT', 'SIGTERM'],
})

server.listen(3000)
