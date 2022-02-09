import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { toServiceUnavailableError } from '../http-error'
import * as S from '../string'
import { NonEmptyString } from '../string'
import { DepositMetadata, createDeposition, publishDeposition, uploadFile } from '../zenodo'
import { NewRapidReview } from './new-rapid-review'

export function publishRapidReviewOnZenodo(review: NewRapidReview) {
  return pipe(
    review,
    reviewToZenodoMetadata,
    createDeposition,
    RTE.chainFirst(
      uploadFile({
        name: 'index.html',
        type: 'text/html',
        content: createRapidReviewHtml(review),
      }),
    ),
    RTE.chain(publishDeposition),
    RTE.mapLeft(toServiceUnavailableError),
  )
}

function reviewToZenodoMetadata(review: NewRapidReview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: S.nonEmpty('Rapid review title'),
    creators: [{ name: review.name, orcid: O.none }],
    description: createRapidReviewHtml(review),
    keywords: O.some(['rapid-review']),
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

function createRapidReviewHtml(review: NewRapidReview) {
  return `
    <table>
      <tr>
        <th>Are the findings novel?
        <td>${review.novel}
      <tr>
        <th>Are the results likely to lead to future research?
        <td>${review.future}
      <tr>
        <th>Is sufficient detail provided to allow reproduction of the study
        <td>${review.replication}
      <tr>
        <th>Are the methods and statistics appropriate for the analysis?
        <td>${review.methods}
      <tr>
        <th>Are the principal conclusions supported by the data and analysis?
        <td>${review.conclusions}
      <tr>
        <th>Does the manuscript discuss limitations?
        <td>${review.limitations}
      <tr>
        <th>Have the authors adequately discussed ethical concerns?
        <td>${review.ethical}
      <tr>
        <th>Does the manuscript include new data?
        <td>${review.data}
      <tr>
        <th>Are the data used in the manuscript available?
        <td>${review.available}
      <tr>
        <th>Is the code used in the manuscript available?
        <td>${review.code}
      <tr>
        <th>Would you recommend this manuscript to others?
        <td>${review.manuscript}
      <tr>
        <th>Do you recommend this manuscript for peer review?
        <td>${review.review}
    </table>
  ` as NonEmptyString
}
