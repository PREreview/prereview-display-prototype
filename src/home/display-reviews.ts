import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { intercalate } from 'fp-ts/Semigroup'
import { constant, pipe } from 'fp-ts/function'
import { DoiData } from '../fetch-doi'
import { preprintMatch } from '../router'
import * as S from '../string'
import { ZenodoRecord } from '../zenodo'

type Review = {
  preprint: DoiData
  review: ZenodoRecord
}

function displayReview({ preprint, review }: Review) {
  return `
    <div class="row g-0 border rounded overflow-hidden flex-md-row mb-4 shadow-sm h-md-250 position-relative">
      <div class="col p-4 d-flex flex-column position-static">
        <h3 class="mb-0">${preprint.title}</h3>
        <p>Reviewed by ${pipe(
          review.metadata.creators,
          RNEA.foldMap(pipe(S.Semigroup, intercalate(', ')))(creator => creator.name),
        )}
        <p><a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="stretched-link">Read reviews</a>
      </div>
      <div class="col-auto p-4">
        <time class="text-muted">${pipe(
          preprint.published,
          O.match(constant(S.empty), date => date.toDateString()),
        )}</time>
      </div>
    </div>
`
}

const displayNoReviews = constant('<p>No reviews yet.</p>')
const displayReviews = RNEA.foldMap(S.Semigroup)(displayReview)
export const maybeDisplayReviews = RA.match(displayNoReviews, displayReviews)
