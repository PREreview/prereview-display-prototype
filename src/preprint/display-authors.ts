import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { constant, pipe } from 'fp-ts/function'
import * as orcid from 'orcid-ts'
import { Author } from '../fetch-doi'
import * as S from '../string'

function displayAuthor(author: Author): string {
  if (O.isSome(author.orcid)) {
    return `<a href="${pipe(author.orcid.value, orcid.toUrl)}" class="text-decoration-none link-dark">
      ${author.name}
      <img alt="ORCID logo" src="https://orcid.org/assets/vectors/orcid.logo.icon.svg" width="16" height="16" class="align-baseline">
    </a>`
  }

  return author.name
}

const displayNoAuthors = constant('Unknown')

export const displayAuthors = RNEA.foldMap(S.Semigroup)(displayAuthor)

export const maybeDisplayAuthors = RA.match(displayNoAuthors, displayAuthors)
