interface modelInfo {
	name: string;
	uuid: string;
	posx: number;
	posy: number;
	posz: number;
	rotx: number;
	roty: number;
	rotz: number;
	length: number;
	width: number;
	height: number;
	alternate: boolean;
	outline: boolean;
	collision: boolean;
	color: string;
}
interface userInfo {
	userID: string;
	data: string;
}
interface checkInfo {
	temperature: string;
	dampness: string;
	pressure: string;
}

interface fullInfo {
	path: string;
	children: [];
	modelInfo: modelInfo;
	userInfo: userInfo;
	displayInfo: checkInfo;
}
