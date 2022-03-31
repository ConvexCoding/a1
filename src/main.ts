import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'is it Working?'
	}
});

export default app;