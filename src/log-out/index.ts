import { pipe } from 'fp-ts/function'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'

export const logOut = pipe(
  RM.of('/'),
  RM.ichainW(RM.redirect),
  RM.ichain(() => RM.clearCookie('session', {})),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
)
