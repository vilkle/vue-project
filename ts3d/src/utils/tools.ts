export default function createInfo(): any {
	return {
		path: '',
		modelInfo: {
			name: '',
			uuid: '',
			posx: 0,
			posy: 0,
			posz: 0,
			rotx: 0,
			roty: 0,
			rotz: 0,
			length: 1,
			width: 1,
			height: 1,
			alternate: false,
			outline: false,
			collision: false,
			color: '',
		},
		displayInfo: {
			temperature: '88度',
			dampness: '50%',
			pressure: '50pa',
		},
		userInfo: {
			userID: '',
			data: '',
		},
		children: [],
	};
}
