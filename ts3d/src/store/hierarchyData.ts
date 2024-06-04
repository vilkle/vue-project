import {defineStore} from 'pinia';
import {any} from 'three/examples/jsm/nodes/Nodes.js';

export const useHierarchyDataStore = defineStore('hierarchy', {
	state() {
		return {
			data: [
				{
					label: '场景',
					id: '-1',
					children: Array<any>(),
				},
			],
		};
	},
});
