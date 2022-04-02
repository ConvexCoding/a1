import { acos, sin, sqrt, sum, tan } from 'mathjs'
import type { Lens } from './lens'
import { Vector3D } from './vector'
import { trace3DRay } from './raytrace'
import type {  Ray } from './raytrace'

const zeroDir = new Vector3D(0.0, 0.0, 1.0)

// next two structs or interfaces used just to facilitate moving the data
// back to the caller
export interface BasicStats {
    min: number,
    max: number,
    pv: number,
    average: number,
    rms: number
  }

export interface LsaResults {
    rayout: Ray
    lsa: number,
    aoi: number
}

// calculates the RMS spot size error across one radial slice of the part - of course along the 0 to ymax
// this spot size error is essentially the error function used in the optimization of the lens
// this function should be wired to the main lens design sheet "Error Func" which is probably is not grammatically correct
export function radialRMSError( raySet: number [], lens: Lens, refocus: number, halfCa: number ): BasicStats {

    let eZeroDir = new Vector3D(0.0, 0.0, 1.0)
    let sumSum = 0;
    let Sum = 0.0;
    let min = 1.0e20;
    let max = -1.0e20
    raySet.forEach(function (value) {
        let p = new Vector3D(0.0, value * halfCa, 0)
        let y = trace3DRay(p, zeroDir, lens, 0.0).pVector.y
        
        if (y < min)
        {
            min = y
        }
        if (y > max)
        {
            max = y
        }

        Sum += y
        sumSum += y * y
    })

    let average = (Sum / raySet.length)
    let rms = sqrt(sumSum / raySet.length)
    let eStat: BasicStats = {min: min, max: max, pv: (max - min), average: average, rms: rms }
    return eStat;
}

// calculates the WFE (wavefront error) across one radial slice of the part - of course along the 0 to ymax
// this function should be wired to the main lens design sheet "WFE Error" which is probably is not grammatically correct
export function raidalWFE(lens: Lens, refocus: number, halfCA: number, numsamples: number): number {
    let min = 1.0e20
    let max = -1.0e20

    for (let i = 0; i < numsamples; i++) {
        let y = halfCA * i / (numsamples - 1)
        let p0 = new Vector3D(0.0, y, 0.0)
        let wfe = calcWfeVecs(p0, zeroDir, lens, refocus)
        if (wfe < min)
        {
            min = wfe
        }
        if (wfe > max)
        {
            max = wfe
        }
        //console.log("y: " + y.toFixed(3) + ",   wfe: " + wfe.toFixed(6))
    }
    return (max - min)
}

// this function can be used to produce a WFE grid that can be turned into a bitmap or 2d wavefront map
// this will only be useful I guess until the GPU calculators get going???
export function GenWfeMap(lens: Lens, refocus: number, halfCa: number, gridsize: number): number[][] {

    var wfemap: number[][] = new Array();
    let inc = 2.0 * halfCa / (gridsize - 1)
    const diag = halfCa * halfCa * 1.0001    // add a little extra to make sure and get the cardinal points
    for (let row = 0; row < gridsize; row++) 
    {
        wfemap[row] = new Array(gridsize - 1 - row);
        for (let col = 0; col < gridsize; col++) 
        {
            let x = -halfCa + row * inc
            let y = -halfCa + col * inc
            if (diag > (x * x + y * y))
            {
                let p = new Vector3D(x, y, 0.0)
                wfemap[row][col] = calcWfeVecs(p, zeroDir, lens, refocus)
            }
            else
            wfemap[row][col] = NaN
        }
    }
    return wfemap
}

// this function can be used to produce a WFE grid that can be turned into a bitmap or 2d wavefront map
// this will only be useful I guess until the GPU calculators get going???
export function GenFlatWfeMap(lens: Lens, refocus: number, halfCa: number, gridsize: number): number[] {

    var wfemap: number[] = new Array();
    let inc = 2.0 * halfCa / (gridsize - 1)
    const diag = halfCa * halfCa * 1.0001    // add a little extra to make sure and get the cardinal points
    for (let row = 0; row < gridsize; row++) 
    {
        for (let col = 0; col < gridsize; col++) 
        {
            let x = -halfCa + row * inc
            let y = -halfCa + col * inc
            if (diag > (x * x + y * y))
            {
                wfemap.push(calcWfeVecs(new Vector3D(x, y, 0.0), zeroDir, lens, refocus))
            }
            else
            wfemap.push( NaN )
        }
    }
    return wfemap
}


export function GenSpotDiagram(lens: Lens, refocus: number, halfCa: number, gridsize: number): Ray[] {

    var map: Ray[] = new Array()
    
    let inc = 2.0 * halfCa / (gridsize - 1)
    const diag = halfCa * halfCa * 1.0001    // add a little extra to make sure and get the cardinal points
    for (let row = 0; row < gridsize; row++) 
    {
        for (let col = 0; col < gridsize; col++) 
        {
            let x = -halfCa + row * inc
            let y = -halfCa + col * inc
            if (diag > (x * x + y * y))
            {
                map.push(trace3DRay(new Vector3D(x, y, 0.0), zeroDir, lens, refocus))
            }
        }
    }
    return map
}


export function CalcRMSSpotSize(spots: Ray[]): BasicStats {
    var sum = 0.0;
    var sumsquare = 0.0; 
    let min = 1.0e20
    let max = -1.0e20

    for (var r of spots) {
        let radialdist = sqrt(r.pVector.x * r.pVector.x + r.pVector.y * r.pVector.y)
        sumsquare += radialdist * radialdist
        sum += radialdist
        if (radialdist < min)
        {
            min = radialdist
        }
        if (radialdist > max)
        {
            max = radialdist
        }
      }
      let eStat: BasicStats = {min: min, max: max, pv: (max - min), average: sum / spots.length, rms: sqrt(sumsquare / spots.length) }
      return eStat
}


// *************************************************************************
// all functions below would normally not be exported, but they now are so  
// that the test1.ts main program can debug or vet their results.
// *************************************************************************

export function calcWfeVecs(p0: Vector3D, e0: Vector3D, lens: Lens, refocus: number): number {

    let p1 = new Vector3D(p0.x / sqrt(2.0), p0.y / sqrt(2.0), 0.0)

    let rsq = p0.x * p0.x + p0.y * p0.y
    let rsqsq = rsq * rsq

    if (rsq < 1.0e-8)
    {
        return 0.0
    }

    let lstatm = CalcLSAVecs(p0, e0, lens, 0.0)
    let lstatz = CalcLSAVecs(p1, e0, lens, 0.0)

    let a = (4.0 * lstatz.lsa - lstatm.lsa) / rsq
    let b = (2.0 * lstatm.lsa - 4.0 * lstatz.lsa) / rsqsq

    /*
    console.log("")
    console.log("p0: " + p0.toString2(3))
    console.log("e0: " + e0.toString2(3));
    console.log("p1: " + p1.toString2(3))
    console.log("rm.v: " + lstatm.rayout.pVector.toString2(6))
    console.log("rz.v: " + lstatz.rayout.pVector.toString2(6))
    console.log("lstatm: " + LsaResToStr(lstatm, 6))
    console.log("lstatz: " + LsaResToStr(lstatz, 6))
    console.log("a: " + a.toFixed(8))
    console.log("b: " + b.toFixed(8))
    */
    return (1000.0 * (sin(lstatm.aoi) * sin(lstatm.aoi) / 2.0) * (refocus - a * rsq / 2.0 - b * rsqsq / 3.0) / lens.wavelength)
}

export function  CalcLSAVecs(p0: Vector3D, e0: Vector3D, lens: Lens, refocus: number): LsaResults  {

    // taken from rust implementation
    //let aoi = self.edir.dot_product(&CPROPV).acos();
    //let lsa = -1.0 * (self.pvector.x.powi(2) + self.pvector.y.powi(2)).sqrt() / aoi.tan();
    //(aoi, lsa)

    let rayout = trace3DRay(p0, e0, lens, refocus)
    let aoi = acos(Vector3D.dotProduct(rayout.eDir, zeroDir));
    let lsa = -1.0 * sqrt(rayout.pVector.x * rayout.pVector.x + rayout.pVector.y * rayout.pVector.y) / tan(aoi);
    let lsares: LsaResults = {rayout: rayout, lsa: lsa, aoi: aoi}
    return lsares  // calls to this function expect radians
}


// *************************************************************************
// temporary utils
// *************************************************************************

function LsaResToStr (lsar: LsaResults, places: number )
{
    return "{lsa: " + lsar.lsa.toFixed(places) + ",  aoi: " + lsar.aoi.toFixed(places) + "}" 
}

