import { acos, round, sin, sqrt, sum, tan } from 'mathjs'
import type { Lens } from './lens'
import { Vector3D } from './vector'
import { calcWfeVecs } from './erroranalysis'
import type {  Ray } from './raytrace'

const zeroDir = new Vector3D(0.0, 0.0, 1.0)

// this function can be used to produce a WFE grid that can be turned into a bitmap or 2d wavefront map
// this will only be useful I guess until the GPU calculators get going???
export function GenWfeMapBits(lens: Lens, refocus: number, halfCa: number, gridsize: number): number[][] {

    var wfemap: number[][] = new Array();
    let inc = 2.0 * halfCa / (gridsize - 1)
    const diag = halfCa * halfCa * 1.0001    // add a little extra to make sure and get the cardinal points

    let min = 1e20;
    let max = -1e20;
    let ctx = 0;
    let sum = 0;
    let sumsum = 0;

    for (let row = 0; row < gridsize; row++) 
    {
        wfemap[row] = new Array()
        for (let col = 0; col < gridsize; col++) 
        {
            let x = -halfCa + row * inc
            let y = -halfCa + col * inc
            if (diag > (x * x + y * y))
            {
                let p = new Vector3D(x, y, 0.0)
                wfemap[row][col] = calcWfeVecs(p, zeroDir, lens, refocus)
                if (wfemap[row][col] < min)
                {
                    min = wfemap[row][col];
                }
                if (wfemap[row][col] > max)
                {
                    max = wfemap[row][col];
                }
                sum += wfemap[row][col];
                sumsum += wfemap[row][col] * wfemap[row][col];
                ctx += 1;
            }
            else
            wfemap[row][col] = NaN
        }
    }
    
    let varirms = sqrt((sumsum - sum * sum / ctx) / (ctx - 1.0));

    let diff = max - min;
    
    // put into array
    for (let row = 0; row < gridsize; row++) 
    {
        for (let col = 0; col < gridsize; col++) 
        {
            if (!isNaN(wfemap[row][col])) {
                wfemap[row][col]  = round(122.0 * (wfemap[row][col] - min) / diff);
            }
            else {
                wfemap[row][col]  = 123;
            }
        }
    }

    
    console.log("Mapper WFE RMS: " + varirms);
    return wfemap
}

