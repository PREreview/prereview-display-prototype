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
  flow(value => cookie.parse(typeof value === 'string' ? value : ''), E.right),
)
export const getCookie = (name: string) => pipe(getCookies, M.map(r.lookup(name)))

export const currentSessionId = pipe(
  RM.ask<SessionEnv>(),
  RM.chainMiddlewareK(({ secret }) =>
    pipe(
      getCookie('session'),
      M.map(
        flow(
          O.chainNullableK(value => cookieParser.signedCookie(value, secret) || null),
          O.filter(UUID.isUuid),
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
        RM.chainTaskK(
          flow(
            TO.fromOption,
            TO.getOrElse(() => sessionStore.newSessionId()),
          ),
        ),
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
          TE.fromOption(() => 'No session ID'),
          TE.chainTaskOptionK(() => 'No session found')(sessionStore.get),
          TE.map(O.some),
          TE.altW(() => TE.right(O.none as O.Option<JsonRecord>)),
        ),
      ),
    ),
  ),
)
