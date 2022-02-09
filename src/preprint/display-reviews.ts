import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as B from 'fp-ts/boolean'
import { constant, flow, pipe } from 'fp-ts/function'
import textClip from 'text-clipper'
import { reviewMatch } from '../router'
import * as S from '../string'
import { ZenodoRecord } from '../zenodo'
import { displayAuthors } from './display-authors'

function displayFullReview(review: ZenodoRecord) {
  return `
<div class="card mb-3">
  <div class="card-body">
    <h5 class="card-title">${pipe(review.metadata.creators, displayAuthors)}</h5>
    <h6 class="card-subtitle mb-2 text-muted">${review.doi}</h6>
    <div class="card-text">
      ${textClip(review.metadata.description, 500, { html: true, maxLines: 5 })}
    </div>
    <a href="${format(reviewMatch.formatter, { id: review.id })}">Read the full review</a>
  </div>
</div>
`
}

function displayRapidReview(review: ZenodoRecord) {
  return `
<div class="card mb-3">
  <div class="card-body">
    <h5 class="card-title"><span class="badge bg-secondary">Rapid Review</span> ${pipe(
      review.metadata.creators,
      displayAuthors,
    )}</h5>
    <h6 class="card-subtitle mb-2 text-muted">${review.doi}</h6>
    <div class="card-text">
      ${review.metadata.description}
    </div>
  </div>
</div>
`
}

function isARapidReview(review: ZenodoRecord) {
  return pipe(review.metadata.keywords, O.filter(RA.elem(S.Eq)('rapid-review')), O.isSome)
}

function displayReview(review: ZenodoRecord) {
  return pipe(
    review,
    isARapidReview,
    B.match(
      () => displayFullReview(review),
      () => displayRapidReview(review),
    ),
  )
}

const displayNoReviews = constant(`<p>No reviews yet.</p>`)

const displayReviews = flow(RNEA.map(displayReview), S.join(S.empty))

export const maybeDisplayReviews = RA.match(displayNoReviews, displayReviews)
