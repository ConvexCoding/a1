<script lang="ts">
  import { getFlatArray } from './somefuncs'
  import WavefrontMap from './WavefrontMap.svelte'

  export let name: string

  const src = 'images/narrow.png'
  const gridSize = 301
  const canvasMapWidth = 450
  const canvasMapHeight = 310
  const [map2, min, max] = getFlatArray(gridSize)
</script>

<main>
  <h1>Hello - {name}!</h1>

  <img {src} alt="" />

  <p>{`map2 Dimensions: ${gridSize} by ${gridSize}`}</p>
  <p>{`map2.flattend Dimensions: ${map2.length}`}</p>

  <WavefrontMap {gridSize} {canvasMapWidth} {canvasMapHeight} {map2} {min} {max} />
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
</style>
