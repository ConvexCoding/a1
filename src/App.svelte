<script lang="ts">
  import { addTwoNums, getarray, getflatarray } from './somefuncs'
  import { colormap } from './lib/colormap'

  export let name: string

  const two = addTwoNums(11, 22)
  const src = 'images/narrow.png'
  const gridsize = 301
  const [map2, min, max] = getflatarray(gridsize)
  const idatal = 0
  const canvasmapwidth = 450
  const canvasmapheight = 310

  import { onMount } from 'svelte'

  let canvas
  onMount(() => {
    const bwidth = 3
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(bwidth, bwidth, gridsize, gridsize)
    for (let p = 0; p < imageData.data.length; p += 4) {
      imageData.data[p + 0] = colormap[map2[p / 4]][0]
      imageData.data[p + 1] = colormap[map2[p / 4]][1]
      imageData.data[p + 2] = colormap[map2[p / 4]][2]
      imageData.data[p + 3] = 255
    }
    ctx.putImageData(imageData, bwidth, bwidth)

    const scaleheight = colormap.length - 1
    const scalewdith = 40
    const colorscale = ctx.getImageData(0, 0, scalewdith, scaleheight)

    for (let row = 0; row < scaleheight; row++) {
      for (let col = 0; col < scalewdith; col++) {
        const posi = col * 4 + row * 4 * scalewdith
        const cmaposi = colormap.length - row - 1
        colorscale.data[posi + 0] = colormap[cmaposi][0]
        colorscale.data[posi + 1] = colormap[cmaposi][1]
        colorscale.data[posi + 2] = colormap[cmaposi][2]
        colorscale.data[posi + 3] = 255
        console.log(row, col, posi)
      }
    }

    console.log('total gridsize: ' + colorscale.data.length)
    console.log('scale width: ' + scalewdith)
    console.log('scale height: ' + scaleheight)
    const vposi = (canvasmapheight - colormap.length) / 2
    ctx.putImageData(colorscale, 340, vposi)

    //var section2 = ctx.getImageData(200, bwidth, gridsize, gridsize);
    //ctx.putImageData(imageData, 200, bwidth);

    const textctr = 340 + scalewdith / 2
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#000'
    ctx.fillText('WFE P-to-V: ', textctr, vposi - 40)
    ctx.font = '12px Arial'
    ctx.fillText('Max: ' + max.toFixed(3), textctr, vposi - 5)
    ctx.fillText('Min: ' + min.toFixed(3), textctr, vposi + colormap.length + 15)
  })
</script>

<main>
  <h1>Hello - {name}!</h1>
  <p>Add two numbers produces {two} as sum of 11 plus 22.</p>
  <p>{map2[5]} {'  *****  '} {colormap[2]} {' ** '} {colormap[2][3]}</p>

  <img {src} alt="" />

  <p>{'map2 Dimensions: '} {gridsize} {' by '} {gridsize}</p>
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
