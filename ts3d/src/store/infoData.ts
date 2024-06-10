import {defineStore} from 'pinia';

export const useInfoDataStore = defineStore('infoArr', {
	state() {
		return {
			data: {models: [], reload: false},
		};
	},
});
