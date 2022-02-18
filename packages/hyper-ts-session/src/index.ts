import cookie from 'cookie'
import cookieParser from 'cookie-parser'
import * as E from 'fp-ts/Either'
import { JsonRecord } from 'fp-ts/Json'
import * as O from 'fp-ts/Option'
import * as r from 'fp-ts/Record'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as TO from 'fp-ts/TaskOption'
import { flow, pipe } from 'fp-ts/function'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as d from 'io-ts/Decoder'
import * as UUID from 'uuid-ts'

export type SessionEnv = {
  secret: string
  sessionStore: SessionStore
}

export function inMemorySessionStore(): SessionStore {
  const sessions = new Map<UUID.Uuid, JsonRecord>()

  return {
    delete: id => async () => {
      sessions.delete(id)
    },
    get: id => async () => O.fromNullable(sessions.get(id)),
    newSessionId: T.fromIOK(UUID.v4),
    put: id => session => async () => {
      sessions.set(id, session)
    },
  }
}

export interface SessionStore {
  newSessionId: () => T.Task<UUID.Uuid>
  get: (id: UUID.Uuid) => TO.TaskOption<JsonRecord>
  put: (id: UUID.Uuid) => (session: JsonRecord) => T.Task<void>
  delete: (id: UUID.Uuid) => T.Task<void>
}

export const getCookies = M.decodeHeader(
  'Cookie',
  flow(
    d.string.decode,
    E.bimap(() => 'no-cookies' as const, cookie.parse),
  ),
)
export const getCookie = (name: string) =>
  pipe(
    getCookies,
    M.mapLeft(() => 'no-cookie' as const),
    M.chainEitherKW(
      flow(
        // todo add chainOptionKW
        r.lookup(name),
        E.fromOption(() => 'no-cookie' as const),
      ),
    ),
  )

export const currentSessionId = pipe(
  RM.ask<SessionEnv>(),
  RM.chainMiddlewareK(({ secret }) =>
    pipe(
      getCookie('session'),
      M.mapLeft(() => 'no-session' as const),
      M.chainEitherKW(
        flow(
          value => cookieParser.signedCookie(value, secret) || null,
          E.fromNullable('no-session' as const),
          E.filterOrElse(UUID.isUuid, () => 'no-session' as const),
        ),
      ),
    ),
  ),
)

export const saveSession = (session: JsonRecord) =>
  pipe(
    RM.ask<SessionEnv>(),
    RM.chain(({ sessionStore }) =>
      pipe(
        currentSessionId,
        RM.orElseW(() => pipe(sessionStore.newSessionId(), RM.rightTask)),
        RM.chainFirstTaskK(id => sessionStore.put(id)(session)),
      ),
    ),
  )

export const getSession = pipe(
  RM.ask<SessionEnv>(),
  RM.chain(({ sessionStore }) =>
    pipe(
      currentSessionId,
      RM.chainTaskEitherK(
        flow(
          sessionStore.get,
          TE.fromTaskOption(() => 'no-session' as const),
        ),
      ),
    ),
  ),
)
