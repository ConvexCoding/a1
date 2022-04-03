export function addTwoNums(n1: number, n2: number): number {
  return n1 + n2
}
import { GenWfeMapBits, GenFlatWfeMapBits } from './lib/mappers'
import { Lens, Surface } from './lib/lens'
import Material from './lib/material'

export function getarray(gridsize: number): number[][] {
  let surf1 = new Surface(25, 44.966, 0.0, 0.0, 0.0)
  let surf2 = new Surface(25, -1000, 0.0, 0.0, 0.0)
  let mat = Material.fromString('FusedSilica')
  let lens = new Lens(25, 5, mat, 1.07, surf1, surf2)

  let [newmap, min, max] = GenWfeMapBits(lens, -0.711, 10.0, gridsize)

  return newmap
}

export function getflatarray(gridsize: number): [number[], number, number] {
  let surf1 = new Surface(25, 44.966, 0.0, 0.0, 0.0)
  let surf2 = new Surface(25, -1000, 0.0, 0.0, 0.0)
  let mat = Material.fromString('FusedSilica')
  let lens = new Lens(25, 5, mat, 1.07, surf1, surf2)

  let [newmap, min, max] = GenFlatWfeMapBits(lens, -0.58, 10.0, gridsize)

  return [newmap, min, max]
}
