import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { constant, flow, pipe } from 'fp-ts/function'
import { reviewMatch } from '../router'
import * as S from '../string'
import { ZenodoRecord } from '../zenodo'
import { displayAuthors } from './display-authors'

function displayReview(review: ZenodoRecord) {
  return `
<div class="card">
  <div class="card-body">
    <h5 class="card-title">${pipe(review.metadata.creators, displayAuthors)}</h5>
    <h6 class="card-subtitle mb-2 text-muted">${review.doi}</h6>
    <p class="card-text">${review.metadata.description}</p>
    <a href="${format(reviewMatch.formatter, { id: review.id })}">Read the full review</a>
  </div>
</div>
`
}

const displayNoReviews = constant(`<p>No reviews yet.</p>`)

const displayReviews = flow(RNEA.map(displayReview), S.join(S.empty))

export const maybeDisplayReviews = RA.match(displayNoReviews, displayReviews)
