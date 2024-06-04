import {defineStore} from 'pinia';

export const useModelCardStore = defineStore('card', {
	state() {
		return {
			data: {name: '', path: '', posx: 0, posy: 0},
		};
	},
});
