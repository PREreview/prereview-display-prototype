import * as d from './decoder'
import * as s from './string'

export const EnvD = d.struct({
  ZENODO_API_KEY: s.NonEmptyStringD,
})
