import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { Doi } from '../../packages/doi-ts'
import { logInMatch, publishRapidReviewMatch, publishReviewMatch } from '../router'
import { User } from '../user'

const displayLogInButton = () => `
  <div class="mt-5">
    <a href="${format(logInMatch.formatter, {})}" class="btn btn-outline-primary">Log in</a> to submit a review
  </div>
`

const displayAddReviewButtons = (preprint: Doi) => `
  <a href="${format(publishReviewMatch.formatter, { doi: preprint })}" class="btn btn-primary mt-5">
    Add PREreview
  </a>

  <a href="${format(publishRapidReviewMatch.formatter, { doi: preprint })}" class="btn btn-primary mt-5">
    Add rapid review
  </a>
`

export const maybeDisplayAddReviewButtons: (preprint: Doi) => (user: O.Option<User>) => string = preprint =>
  O.match(displayLogInButton, () => displayAddReviewButtons(preprint))
