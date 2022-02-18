import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { getSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as c from './codec'

export const UserC = c.struct({
  name: c.string,
})

export type User = c.TypeOf<typeof UserC>

export const getUser = pipe(
  getSession,
  RM.chainEitherKW(UserC.decode),
  RM.map(O.some),
  RM.orElse(() => RM.of(O.none as O.Option<User>)),
)
