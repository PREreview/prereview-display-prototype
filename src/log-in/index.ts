import * as anonymus from 'anonymus'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { constant, flow, pipe } from 'fp-ts/function'
import { saveSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as d from '../decoder'
import { User, UserC } from '../user'

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const newUser: IO.IO<User> = () => ({
  name: `${anonymus.randomColor()} ${capitalize(anonymus.randomAnimal())}`,
})

export const logIn = pipe(
  RM.rightIO(newUser),
  RM.chain(flow(UserC.encode, saveSession)),
  RM.ichainFirstW(() => redirectToReferer),
  RM.ichain(sessionId => RM.cookie('session', sessionId, { signed: true })),
  RM.ichain(() => RM.closeHeaders()),
  RM.ichain(() => RM.end()),
)

const redirectToReferer = pipe(
  RM.gets(c => pipe(c.getHeader('Referer'), d.string.decode, E.getOrElse(constant('/')))), // TODO sanitise the Referer header
  RM.ichain(RM.redirect),
)
