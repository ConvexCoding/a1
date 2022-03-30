export class Vector3D {
  x: number
  y: number
  z: number

  constructor(xin: number, yin: number, zin: number) {
    this.x = xin
    this.y = yin
    this.z = zin
  }

  static dotProduct(a: Vector3D, b: Vector3D) {
    return a.x * b.x + a.y * b.y + a.z * b.z
  }

  get lengthSquared() {
    return this.x ** 2 + this.y ** 2 + this.z ** 2
  }

  get length() {
    return Math.sqrt(this.lengthSquared)
  }

  get magnitude() {
    return this.length
  }

  get isAlmostZero() {
    return this.length < 0.05
  }

  normalize() {
    const mag = this.magnitude
    this.x /= mag
    this.y /= mag
    this.z /= mag
  }

  toString(decimals = 4) {
    return `{X= ${this.x.toFixed(decimals)},   Y= ${this.y.toFixed(
      decimals
    )},   Z= ${this.z.toFixed(decimals)}}`
  }

  toString2(decimals = 4) {
    return `${this.x.toFixed(decimals)}, ${this.y.toFixed(decimals)}, ${this.z.toFixed(decimals)}`
  }

  static add(a: Vector3D, b: Vector3D) {
    return new Vector3D(a.x + b.x, a.y + b.y, a.z + b.z)
  }
  add(b: Vector3D) {
    return Vector3D.add(this, b)
  }

  static sub(a: Vector3D, b: Vector3D) {
    return new Vector3D(a.x + b.x, a.y + b.y, a.z + b.z)
  }
  sub(b: Vector3D) {
    return Vector3D.sub(this, b)
  }

  static multiply(a: Vector3D, b: Vector3D | number) {
    if (typeof b === 'number') {
      return new Vector3D(a.x * b, a.y * b, a.z * b)
    } else {
      return new Vector3D(a.x * b.x, a.y * b.y, a.z * b.z)
    }
  }
  multiply(b: number | Vector3D) {
    return Vector3D.multiply(this, b)
  }

  static divide(a: Vector3D, b: Vector3D | number) {
    if (typeof b === 'number') {
      return new Vector3D(a.x / b, a.y / b, a.z / b)
    } else {
      return new Vector3D(a.x / b.x, a.y / b.y, a.z / b.z)
    }
  }
  divide(b: Vector3D | number) {
    return Vector3D.divide(this, b)
  }
}
