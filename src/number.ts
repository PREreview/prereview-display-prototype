import { isPositive } from 'fp-ts-std/Number'
import { pipe } from 'fp-ts/function'
import * as c from 'io-ts/Codec'
import * as d from './decoder'
import * as e from './encoder'

type Int = number & IntBrand
type PositiveNumber = number & PositiveBrand
export type PositiveInt = Int & PositiveNumber

const isPositiveNumber = (value: number): value is PositiveNumber => isPositive(value)

const isInteger = (value: number): value is Int => Number.isInteger(value)

const NumberFromStringD = pipe(
  d.string,
  d.parse(s => {
    const n = +s
    return isNaN(n) || s.trim() === '' ? d.failure(s, 'Not a number') : d.success(n)
  }),
)

export const NumberFromStringC = c.make(NumberFromStringD, e.string)

const IntD = pipe(d.number, d.refine(isInteger, 'IntD'))

const PositiveNumberD = pipe(d.number, d.refine(isPositiveNumber, 'PositiveNumberD'))

export const PositiveIntD = pipe(IntD, d.intersect(PositiveNumberD))

export const PositiveIntC = c.fromDecoder(PositiveIntD)

interface PositiveBrand {
  readonly Positive: unique symbol
}

interface IntBrand {
  readonly Int: unique symbol
}
