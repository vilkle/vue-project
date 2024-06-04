import {defineStore} from 'pinia';
import {string} from 'three/examples/jsm/nodes/Nodes.js';

export const useModelIDStore = defineStore('id', {
	state() {
		return {
			modelID: '0',
		};
	},
});
