import { isDoi } from 'doi-ts'
import * as d from '../decoder'
import { NonEmptyStringD } from '../string'

const DoiD = d.fromRefinement(isDoi, 'DOI')

const OptionsD = d.literal('Yes', 'No', 'N/A', 'Unsure')

export const NewRapidReviewD = d.struct({
  preprint: DoiD,
  name: NonEmptyStringD,
  novel: OptionsD,
  future: OptionsD,
  replication: OptionsD,
  methods: OptionsD,
  conclusions: OptionsD,
  limitations: OptionsD,
  ethical: OptionsD,
  data: OptionsD,
  available: OptionsD,
  code: OptionsD,
  manuscript: OptionsD,
  review: OptionsD,
})

export type NewRapidReview = d.TypeOf<typeof NewRapidReviewD>
