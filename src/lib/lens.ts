import Material from './material'

type SurfaceType = 'plane' | 'sphere' | 'asphere'

export class Surface {
  ap: number // full aperture
  r: number // radius
  k: number // conic

  // aspheric coeffs
  ad: number
  ae: number

  constructor(
    fullAperture: number | string,
    radius: number | string,
    conic: number | string = 0,
    ad: number | string = 0,
    ae: number | string = 0
  ) {
    this.ap = typeof fullAperture === 'string' ? parseFloat(fullAperture) : fullAperture
    this.r = typeof radius === 'string' ? parseFloat(radius) : radius
    this.k = typeof conic === 'string' ? parseFloat(conic) : conic
    this.ad = typeof ad === 'string' ? parseFloat(ad) : ad
    this.ae = typeof ae === 'string' ? parseFloat(ae) : ae
  }

  get type(): SurfaceType {
    if (
      Math.abs(this.r) < 0.01 &&
      Math.abs(this.k) < 1e-8 &&
      Math.abs(this.ad) < 1e-20 &&
      Math.abs(this.ae) < 1e-20
    ) {
      return 'plane'
    }

    if (Math.abs(this.ad) < 1e-20 && Math.abs(this.ae) < 1e-20) {
      return 'sphere'
    }

    return 'asphere'
  }

  static calcCurv(r: number | string) {
    if (typeof r === 'string') {
      r = parseFloat(r)
    }
    return r === 0 ? 0 : 1 / r
  }

  get c(): number {
    return Surface.calcCurv(this.r)
  }

  set c(c: number) {
    this.r = Surface.calcCurv(c)
  }

  static calcSag(radius: number, conic: number, ad: number, ae: number, x: number, y: number = 0) {
    const c = Surface.calcCurv(radius)
    const hyp = x ** 2 + y ** 2
    const sqrtvalue = 1 - (1 + conic) * c ** 2 * hyp
    return sqrtvalue < 0
      ? 0
      : (c * hyp) / (1 + Math.sqrt(sqrtvalue)) + ad * hyp ** 2 + ae * hyp ** 3
  }

  sagAt(x: number, y: number = 0) {
    return Surface.calcSag(this.r, this.k, this.ad, this.ae, x, y)
  }

  get sag() {
    return this.sagAt(this.ap / 2)
  }

  // need to format the values to match the struct in rust
  toRustStruct() {
    return {
      r: this.r,
      c: this.c,
      k: this.k,
      ad: this.ad,
      ae: this.ae,
      surf_type: this.type === 'plane' ? 0 : this.type === 'sphere' ? 1 : 2,
    }
  }
}

export class Lens {
  diameter: number
  material: Material
  wavelength: number
  ct: number
  surf1: Surface
  surf2: Surface

  constructor(
    diameter: number | string,
    ct: number | string,
    material: Material,
    wavelength: number | string,
    surf1: Surface,
    surf2: Surface
  ) {
    if (surf1.ap > this.diameter || surf2.ap > this.diameter) {
      throw new Error("Surface aperture can't be greater than lens diameter.")
    }

    this.diameter = typeof diameter === 'string' ? parseFloat(diameter) : diameter
    this.ct = typeof ct === 'string' ? parseFloat(ct) : ct
    this.material = material
    this.wavelength = typeof wavelength === 'string' ? parseFloat(wavelength) : wavelength
    this.surf1 = surf1
    this.surf2 = surf2
  }

  static testLens() {
    return new Lens(
      25,
      5,
      Material.FusedSilica,
      1.07,
      new Surface(25, 44.966),
      new Surface(25, -1000)
    )
  }

  get et(): number {
    return this.ct - this.surf1.sag + this.surf2.sag
  }

  set et(val: number | string) {
    console.log('vallll', val)
    val = typeof val === 'string' ? parseFloat(val) : val
    this.ct = val + this.surf1.sag - this.surf2.sag
  }

  get flat1(): number {
    return (this.diameter - this.surf1.ap) / 2
  }

  get flat2(): number {
    return (this.diameter - this.surf2.ap) / 2
  }

  get nIndex(): number {
    return this.material.nIndexAt(this.wavelength)
  }

  static calcEFL(
    s1c: number | string,
    s2c: number | string,
    ct: number | string,
    nIndex: number | string
  ) {
    s1c = typeof s1c === 'string' ? parseFloat(s1c) : s1c
    s2c = typeof s2c === 'string' ? parseFloat(s2c) : s2c
    ct = typeof ct === 'string' ? parseFloat(ct) : ct
    nIndex = typeof nIndex === 'string' ? parseFloat(nIndex) : nIndex

    const phi = (nIndex - 1) * (s1c - s2c + ((nIndex - 1) * ct * s1c * s2c) / nIndex)
    return 1 / phi
  }
  get EFL(): number {
    return Lens.calcEFL(this.surf1.c, this.surf2.c, this.ct, this.nIndex)
  }

  static calcBFL(
    s1c: number | string,
    s2c: number | string,
    ct: number | string,
    nIndex: number | string
  ) {
    s1c = typeof s1c === 'string' ? parseFloat(s1c) : s1c
    s2c = typeof s2c === 'string' ? parseFloat(s2c) : s2c
    ct = typeof ct === 'string' ? parseFloat(ct) : ct
    nIndex = typeof nIndex === 'string' ? parseFloat(nIndex) : nIndex

    const efl = Lens.calcEFL(s1c, s2c, ct, nIndex)
    const pp = (nIndex - 1) * s1c * efl * (1 / nIndex) * ct
    return efl - pp
  }
  get BFL(): number {
    return Lens.calcBFL(this.surf1.c, this.surf2.c, this.ct, this.nIndex)
  }

  // need to format the values to match the struct in rust
  toRustStruct() {
    return {
      diameter: this.diameter,
      // TODO: figure out best meaning for clear_ap here
      clear_ap: Math.min(this.surf1.ap, this.surf2.ap),
      ct: this.ct,
      n_index: this.nIndex,
      side1: this.surf1.toRustStruct(),
      side2: this.surf2.toRustStruct(),
    }
  }
}
