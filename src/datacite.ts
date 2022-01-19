import { DoiD } from 'doi-ts'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import * as d from './decoder'

const DataciteDescriptionD = pipe(
  {
    Abstract: d.struct({
      description: d.string,
      descriptionType: d.literal('Abstract'),
    }),
    Other: d.struct({
      description: d.string,
      descriptionType: d.literal('Other'),
    }),
  },
  d.sum('descriptionType'),
)

export const DataciteDoiD = d.struct({
  descriptions: d.readonlyNonEmptyArray(DataciteDescriptionD),
  doi: DoiD,
  titles: d.readonlyNonEmptyArray(
    d.struct({
      title: d.string,
    }),
  ),
})

type DataciteAbstract = Extract<DataciteDescription, { descriptionType: 'Abstract' }>
type DataciteDescription = d.TypeOf<typeof DataciteDescriptionD>
export type DataciteDoi = d.TypeOf<typeof DataciteDoiD>

export function getFirstTitle(doi: DataciteDoi): string {
  return doi.titles[0].title
}

export const getFirstAbstract: (doi: DataciteDoi) => O.Option<DataciteAbstract> = flow(
  doi => doi.descriptions,
  RA.findFirst(isAbstract),
)

export function getDescriptionText<T extends DataciteDescription>(description: T): T['description'] {
  return description.description
}

function isAbstract(description: DataciteDescription): description is DataciteAbstract {
  return description.descriptionType === 'Abstract'
}
