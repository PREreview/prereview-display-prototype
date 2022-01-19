import * as O from 'fp-ts/Option'
import { constant } from 'fp-ts/function'

const displayNoAbstract = constant('<p>No abstract available</p>')

export const maybeDisplayAbstract = O.getOrElse(displayNoAbstract)
