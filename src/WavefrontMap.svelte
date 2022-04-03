<script lang="ts">
  import { colorMap } from './lib/colormap'

  export let gridSize: number
  export let canvasMapWidth: number
  export let canvasMapHeight: number
  export let map2: number[]
  export let min: number
  export let max: number

  // https://svelte.dev/tutorial/actions
  function drawWavefrontMap(node: HTMLCanvasElement) {
    const bWidth = 3
    const ctx = node.getContext('2d')
    const imageData = ctx.getImageData(bWidth, bWidth, gridSize, gridSize)
    for (let p = 0; p < imageData.data.length; p += 4) {
      imageData.data[p + 0] = colorMap[map2[p / 4]][0]
      imageData.data[p + 1] = colorMap[map2[p / 4]][1]
      imageData.data[p + 2] = colorMap[map2[p / 4]][2]
      imageData.data[p + 3] = 255
    }
    ctx.putImageData(imageData, bWidth, bWidth)

    const scaleHeight = colorMap.length - 1
    const scaleWidth = 40
    const colorScale = ctx.getImageData(0, 0, scaleWidth, scaleHeight)

    for (let row = 0; row < scaleHeight; row++) {
      for (let col = 0; col < scaleWidth; col++) {
        const posi = col * 4 + row * 4 * scaleWidth
        const cmaposi = colorMap.length - row - 1
        colorScale.data[posi + 0] = colorMap[cmaposi][0]
        colorScale.data[posi + 1] = colorMap[cmaposi][1]
        colorScale.data[posi + 2] = colorMap[cmaposi][2]
        colorScale.data[posi + 3] = 255
        console.log(row, col, posi)
      }
    }

    console.log('total gridsize: ' + colorScale.data.length)
    console.log('scale width: ' + scaleWidth)
    console.log('scale height: ' + scaleHeight)
    const vposi = (canvasMapHeight - colorMap.length) / 2
    ctx.putImageData(colorScale, 340, vposi)

    //var section2 = ctx.getImageData(200, bwidth, gridsize, gridsize);
    //ctx.putImageData(imageData, 200, bwidth);

    const textctr = 340 + scaleWidth / 2
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#000'
    ctx.fillText('WFE P-to-V: ', textctr, vposi - 40)
    ctx.font = '12px Arial'
    ctx.fillText(`Max: ${max.toFixed(3)}`, textctr, vposi - 5)
    ctx.fillText(`Min: ${min.toFixed(3)}`, textctr, vposi + colorMap.length + 15)
  }
</script>

<canvas use:drawWavefrontMap width={canvasMapWidth} height={canvasMapHeight} />

<style>
  canvas {
    width: 50%;
    height: 50%;
    background-color: white;
    border: 2px solid #000000;
  }
</style>
