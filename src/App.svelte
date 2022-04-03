<script lang="ts">
  import { addTwoNums, getarray, getflatarray } from "./somefuncs";
  import { colormap } from "./lib/colormap";
  let two = addTwoNums(11, 22);
  export let name: string;
  let src = "images/narrow.png";
  let gridsize = 301;
  let [map2, min, max] = getflatarray(gridsize);
  let idatal = 0;
  let canvasmapwidth = 450;
  let canvasmapheight = 310;

  import { onMount } from "svelte";

  let canvas;
  onMount(() => {
    const bwidth = 3;
    const ctx = canvas.getContext("2d");
    var imageData = ctx.getImageData(bwidth, bwidth, gridsize, gridsize);
    for (let p = 0; p < imageData.data.length; p += 4) {
      imageData.data[p + 0] = colormap[map2[p / 4]][0];
      imageData.data[p + 1] = colormap[map2[p / 4]][1];
      imageData.data[p + 2] = colormap[map2[p / 4]][2];
      imageData.data[p + 3] = 255;
    }
    ctx.putImageData(imageData, bwidth, bwidth);

    let scaleheight = colormap.length - 1;
    var scalewdith = 40;
    var colorscale = ctx.getImageData(0, 0, scalewdith, scaleheight);

    for (let row = 0; row < scaleheight; row++) {
      for (let col = 0; col < scalewdith; col++) {
        let posi = col * 4 + row * 4 * scalewdith;
        let cmaposi = colormap.length - row - 1;
        colorscale.data[posi + 0] = colormap[cmaposi][0];
        colorscale.data[posi + 1] = colormap[cmaposi][1];
        colorscale.data[posi + 2] = colormap[cmaposi][2];
        colorscale.data[posi + 3] = 255;
        console.log(row, col, posi);
      }
    }

    console.log("total gridsize: " + colorscale.data.length);
    console.log("scale width: " + scalewdith);
    console.log("scale height: " + scaleheight);
    let vposi = (canvasmapheight - colormap.length) / 2;
    ctx.putImageData(colorscale, 340, vposi);

    //var section2 = ctx.getImageData(200, bwidth, gridsize, gridsize);
    //ctx.putImageData(imageData, 200, bwidth);

    let textctr = 340 + scalewdith / 2;
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText("WFE P-to-V: ", textctr, vposi - 40);
    ctx.font = "12px Arial";
    ctx.fillText("Max: " + max.toFixed(3), textctr, vposi - 5);
    ctx.fillText(
      "Min: " + min.toFixed(3),
      textctr,
      vposi + colormap.length + 15
    );
  });
</script>

<main>
  <h1>Hello - {name}!</h1>
  <p>Add two numbers produces {two} as sum of 11 plus 22.</p>
  <p>{map2[5]} {"  *****  "} {colormap[2]} {" ** "} {colormap[2][3]}</p>

  <img {src} alt="" />
  <p>{"map2 Dimensions: "} {gridsize} {" by "} {gridsize}</p>
  <p>{"map2.flattend Dimensions: "} {map2.length}</p>
  <p>{"image data length: "} {idatal}</p>
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
