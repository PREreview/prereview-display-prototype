import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { homeMatch, logInMatch, logOutMatch } from './router'
import { User } from './user'

const basicHeader = (userMenu: string) => `
  <header class="p-3 mb-3 border-bottom">
    <div class="container">
      <div class="d-flex flex-wrap align-items-center justify-content-between">
        <div>
          <a href="${format(homeMatch.formatter, {})}" class="fs-4 text-dark text-decoration-none">PREreview</a>
        </div>
        <div class="text-end">
          ${userMenu}
        </div>
      </div>
    </div>
  </header>
`

const userHeader = (user: User) =>
  basicHeader(`
  <div class="dropdown">
    <a href="#" class="d-block link-dark text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
      <img src="https://eu.ui-avatars.com/api/?name=${user.name}" alt="" width="32" height="32" class="rounded-circle">
    </a>
    <ul class="dropdown-menu" aria-labelledby="dropdownUser1">
      <li><a class="dropdown-item" href="${format(logOutMatch.formatter, {})}">Log out</a></li>
    </ul>
  </div>
`)

const noUserHeader = () =>
  basicHeader(`
  <a href="${format(logInMatch.formatter, {})}" class="btn btn-outline-primary">Log in</a>
`)

export const header = O.match(noUserHeader, userHeader)
