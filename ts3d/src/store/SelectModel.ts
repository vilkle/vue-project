import {defineStore} from 'pinia';
import {string} from 'three/examples/jsm/nodes/Nodes.js';

export const useSelectModelStore = defineStore('uuid', {
	state() {
		return {
			model: {name: '', uuid: '', group: []},
		};
	},
});
