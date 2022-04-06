import { isDoi } from 'doi-ts'
import * as d from '../decoder'
import { NonEmptyStringD } from '../string'

const DoiD = d.fromRefinement(isDoi, 'DOI')

export const NewReviewD = d.struct({
  preprint: DoiD,
  name: NonEmptyStringD,
  content: NonEmptyStringD,
})

export type NewReview = d.TypeOf<typeof NewReviewD>
