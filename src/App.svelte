<script lang="ts">
	import  {addTwoNums, getarray} from './somefuncs'
	import {testmap, colormap} from './lib/colormap'
	let two = addTwoNums(11, 22);
	export let name: string;
	let src = 'images/narrow.png'
	let map2 = getarray();

	import { onMount } from 'svelte';
	let canvas;
	onMount(() => {
		const ctx = canvas.getContext('2d');
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		for (let p = 0; p < imageData.data.length; p += 4) {
			const r = 100;
			const g = 100;
			const b = 100;

			imageData.data[p + 0] = r;
			imageData.data[p + 1] = g;
			imageData.data[p + 2] = b;
			imageData.data[p + 3] = 255;
		}

		ctx.putImageData(imageData, 0, 0);

	});
</script>

<main>
	<h1>Hello - {name}!</h1>
	<p>Add two numbers produces {two} as sum of 11 plus 22.</p>
	<p>{map2[5]}</p>
	<img {src} alt=''/>	
	<canvas	bind:this={canvas} width={101} height={20} ></canvas>

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

	@media (min-width: 300px) {
		main {
			max-width: none;
		}
	}

	img {
		width: 201;
		height: 101;
		background-color: coral;
		color: #ff3e00;
	}

	canvas {
		width: 100%;

		background-color: #666;
		border-color: 5px black;
	}


</style>