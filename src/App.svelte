<script lang="ts">
  import { addTwoNums, getArray, getFlatArray } from './somefuncs'
  import { colorMap } from './lib/colormap'

  export let name: string

  const two = addTwoNums(11, 22)
  const src = 'images/narrow.png'
  const gridSize = 301
  const [map2, min, max] = getFlatArray(gridSize)
  const idatal = 0
  const canvasMapWidth = 450
  const canvasMapHeight = 310

  import { onMount } from 'svelte'

  let canvas
  onMount(() => {
    const bWidth = 3
    const ctx = canvas.getContext('2d')
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
    ctx.fillText('Max: ' + max.toFixed(3), textctr, vposi - 5)
    ctx.fillText('Min: ' + min.toFixed(3), textctr, vposi + colorMap.length + 15)
  })
</script>

<main>
  <h1>Hello - {name}!</h1>
  <p>Add two numbers produces {two} as sum of 11 plus 22.</p>
  <p>{map2[5]} {'  *****  '} {colorMap[2]} {' ** '} {colorMap[2][3]}</p>

  <img {src} alt="" />

  <p>{'map2 Dimensions: '} {gridSize} {' by '} {gridSize}</p>
  <p>{'map2.flattend Dimensions: '} {map2.length}</p>
  <p>{'image data length: '} {idatal}</p>

  <canvas bind:this={canvas} width="450" height="310" />
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 310px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 3em;
    font-weight: 100;
  }

  @media (min-width: 310px) {
    main {
      max-width: none;
    }
  }

  img {
    width: auto;
    height: auto;
    background-color: coral;
    color: #ff3e00;
  }

  canvas {
    width: 50%;
    height: 50%;
    background-color: white;
    border: 2px solid #000000;
  }
</style>
