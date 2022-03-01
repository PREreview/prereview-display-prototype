import * as O from 'fp-ts/Option'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { and } from 'fp-ts/Refinement'
import { constant, pipe } from 'fp-ts/function'
import { fetchDoi } from '../fetch-doi'
import { ZenodoRecord, hasRelation, hasScheme, searchRecords } from '../zenodo'

export const fetchDetails = pipe(
  new URLSearchParams({ communities: 'prereview-test-community' }),
  searchRecords,
  RTE.chainW(RTE.traverseArray(fetchDetailsFromReview)),
  RTE.getOrElseW(() => RT.of(RA.empty)),
)

function fetchDetailsFromReview(review: ZenodoRecord) {
  return pipe(
    RTE.Do,
    RTE.apS('review', pipe(review, RTE.right)),
    RTE.apS(
      'preprint',
      pipe(review, RTE.fromOptionK(constant('No reviewed preprint found'))(findFirstReviewedDoi), RTE.chainW(fetchDoi)),
    ),
  )
}

function findFirstReviewedDoi(review: ZenodoRecord) {
  return pipe(
    review.metadata.related_identifiers,
    RA.findFirst(pipe(hasScheme('doi'), and(hasRelation('reviews')))),
    O.map(relatedIdentifier => relatedIdentifier.identifier),
  )
}
