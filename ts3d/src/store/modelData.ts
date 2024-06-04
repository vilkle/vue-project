import {defineStore} from 'pinia';

export const useModelDataStore = defineStore('info', {
	state() {
		return {
			modelData: {
				name: '',
				uuid: '',
				posx: 0,
				posy: 0,
				posz: 0,
				rotx: 0,
				roty: 0,
				rotz: 0,
				length: 0,
				width: 0,
				height: 0,
				alternate: true,
				outline: false,
				collision: false,
				color: '',
			},
		};
	},
});
