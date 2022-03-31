<script lang="ts">
	import  {addTwoNums, getarray, getflatarray} from './somefuncs'
	import {testmap, colormap} from './lib/colormap'
	let two = addTwoNums(11, 22);
	export let name: string;
	let src = 'images/narrow.png'
	let gridsize = 101;
	let map2 = getflatarray(gridsize);
	let idatal = 0;

	import { onMount } from 'svelte';

	let canvas;
	onMount(() => {
		const bwidth = 10;
		const ctx = canvas.getContext('2d');
		var imageData = ctx.getImageData(bwidth, bwidth, gridsize, gridsize);
		idatal = imageData.data.length;
		for (let p = 0; p < imageData.data.length; p += 4) {

			imageData.data[p + 0] = colormap[map2[p/4]][1];
			imageData.data[p + 1] = colormap[map2[p/4]][2];
			imageData.data[p + 2] = colormap[map2[p/4]][3];
			imageData.data[p + 3] = 255;
		}

		ctx.putImageData(imageData, bwidth, bwidth);
	});

</script>

<main>
	<h1>Hello - {name}!</h1>
	<p>Add two numbers produces {two} as sum of 11 plus 22.</p>
	<p>{map2[5]} {"  *****  "} {colormap[2]} {" ** "} {colormap[2][3]}</p>

	<img {src} alt=''/>	
	<p>{"map2 Dimensions: "} {gridsize} {" by "} {gridsize}</p>
	<p>{"map2.flattend Dimensions: "} {map2.length}</p>
	<p>{"image data length: "} {idatal}</p>
	<canvas	bind:this={canvas} ></canvas>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 400px) {
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
		width: 100%;;
		height: 100%;		
		background-color: yellow;
		border: 2px solid #000000;
	}


</style>