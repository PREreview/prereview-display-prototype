import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { toServiceUnavailableError } from '../http-error'
import * as S from '../string'
import { DepositMetadata, createDeposition, publishDeposition, uploadFile } from '../zenodo'
import { NewReview } from './new-review'

export function publishReviewOnZenodo(review: NewReview) {
  return pipe(
    review,
    reviewToZenodoMetadata,
    createDeposition,
    RTE.chainFirst(
      uploadFile({
        name: 'index.txt',
        type: 'text/plain',
        content: review.content,
      }),
    ),
    RTE.chain(publishDeposition),
    RTE.mapLeft(toServiceUnavailableError),
  )
}

function reviewToZenodoMetadata(review: NewReview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: S.nonEmpty('Review title'),
    creators: [{ name: review.name, orcid: O.none }],
    description: review.content,
    keywords: O.none,
    related_identifiers: [
      {
        relation: 'reviews',
        identifier: review.preprint,
        scheme: 'doi',
      },
    ],
    communities: [
      {
        identifier: S.nonEmpty('prereview-test-community'),
      },
    ],
  }
}
