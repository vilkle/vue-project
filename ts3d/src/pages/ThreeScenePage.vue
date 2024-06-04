<script setup lang="ts">
import * as THREE from 'three';
import {
	DRACOLoader,
	DragControls,
	MapControls,
	OrbitControls,
	RGBELoader,
	ThreeMFLoader,
} from 'three/examples/jsm/Addons.js';
import {CSS3DRenderer, CSS3DSprite} from 'three/examples/jsm/Addons.js';
import {getCurrentInstance, onMounted, ref, render, watch, withDirectives} from 'vue';
//import jsonData from '@/json/info.json';
import {loadGLTF} from '../utils/model';
import axios from 'axios';
import {Delete, Plus, Rank, Refresh, FullScreen, WindPower} from '@element-plus/icons-vue';
import {ElButton, translate} from 'element-plus';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {useModelDataStore} from '@/store/modelData';
import {useModelIDStore} from '@/store/modelID';
import {useSelectModelStore} from '@/store/SelectModel';
import {useHierarchyDataStore} from '@/store/hierarchyData';
import {useModelCardStore} from '@/store/modelCardData';
import createInfo from '@/utils/tools';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {ReflectorForSSRPass} from 'three/examples/jsm/Addons.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {
	MeshPhongNodeMaterial,
	color,
	pass,
	reflector,
	texture,
	uv,
	vec2,
	viewportTopLeft,
} from 'three/nodes';
// 主要
import {SSRPass} from 'three/examples/jsm/postprocessing/SSRPass.js';
//import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
// Gamma和ShaderPass主要做矫正用的，习惯写pass通道的时候加上
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {GammaCorrectionShader} from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
// FXAA抗锯齿，常用抗锯齿，测试在SSRPass里好像几种AA抗锯齿都无效
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader.js';

import {Water} from 'three/examples/jsm/objects/Water.js';
import {Sky} from 'three/examples/jsm/objects/Sky.js';

let marker: CSS3DSprite, object01: THREE.Group<THREE.Object3DEventMap>;
let orbit: OrbitControls;
let control: TransformControls;
let box: THREE.BoxHelper;
let modelStore = useModelDataStore();
let modelIDStore = useModelIDStore();
let selectModelStore = useSelectModelStore();
let modelCardStore = useModelCardStore();
let hierarchyStore = useHierarchyDataStore();
let loading = ref(true);
let infoArr: any;
let controlMode: 'translate' | 'rotate' | 'scale';
onMounted(async () => {
	let container;
	let camera: THREE.PerspectiveCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;
	let dragControls: DragControls;
	let controlsMap: MapControls;
	let enableSelection = false;
	let enableDrag = false;
	let group: THREE.Group;
	let objects: THREE.Object3D<THREE.Object3DEventMap>[] = [];
	const mouse = new THREE.Vector2();
	const raycaster = new THREE.Raycaster();
	const canvas = document.getElementById('Canvas');
	let intersections: any;
	let modelSelect: any;
	const instance = getCurrentInstance();
	let css3dRenderer: CSS3DRenderer;
	const css3dContainer = document.querySelector('.css3d');
	const left: any = canvas?.getBoundingClientRect().left;
	const right: any = canvas?.getBoundingClientRect().right;
	const top: any = canvas?.getBoundingClientRect().top;
	const bottom: any = canvas?.getBoundingClientRect().bottom;
	let modelArr: any[] = [];
	let ssrcomposer: EffectComposer;

	try {
		const result01 = await fetchData('./json/info.json');
		infoArr = result01.models;
		//创建一个三维场景
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x2e2d2d);
		//添加环境贴图
		new RGBELoader().setPath('./equirectangular/').load('sky.hdr', function (texture) {
			texture.mapping = THREE.EquirectangularReflectionMapping;
			//scene.background = texture;
			scene.environment = texture;
		});
		// scene.environment = new RGBELoader().load('sky.hdr');
		// scene.environment.mapping = THREE.EquirectangularReflectionMapping;

		//加载gltf模型
		// let infoArr = jsonData.models;
		for (let i = 0; i < infoArr.length; ++i) {
			const info = infoArr[i];
			await deepSearch(info, modelArr, i);
		}
		async function deepSearch(root: any, parent: any[], id: number) {
			await loadGLTF(root, scene, objects);
			if (root.children) {
				parent[id] = [];
				for (let i = 0; i < root.children.length; ++i) {
					await deepSearch(root.children[i], parent[id], i);
				}
				// root.children.forEach((child: any, index: any) => {
				// 	await deepSearch(child, parent[id], index);
				// });
			}
		}

		init();

		// 当两个异步操作都完成后，加载结束
		loading.value = false;
	} catch (error) {
		// 处理错误情况
		console.error(error);
	}

	function init() {
		group = new THREE.Group();
		scene.add(group);
		//widh和height用来设置Three.js输出的Canvas画布尺寸(像素px)
		const width: any = document.getElementById('Canvas')?.offsetWidth;
		const height: any = document.getElementById('Canvas')?.offsetHeight;
		//透视投影相机设置
		//30:视场角度，width/height:Canvas画布宽高比，1:近裁截面，3000:远
		camera = new THREE.PerspectiveCamera(30, width / height, 1, 3000);
		camera.position.set(0, 200, 0);
		camera.lookAt(scene.position);
		renderer = new THREE.WebGLRenderer({antialias: true});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(width, height);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		const axesHelper = new THREE.AxesHelper(100);
		scene.add(axesHelper);

		//添加地面
		// const plane = new THREE.Mesh(
		// 	new THREE.PlaneGeometry(200, 200),
		// 	new THREE.MeshPhongMaterial({color: 0xcbcbcb}),
		// );
		// plane.rotation.x = -Math.PI / 2;
		// plane.position.y = -0.0001;
		// scene.add(plane);

		const floorGeometry = new THREE.PlaneGeometry(100, 100);
		const floorGeometry1 = new THREE.PlaneGeometry(100, 100);
		const material01 = new THREE.MeshPhongMaterial({
			color: 0x818181,
			shininess: 30, //高光部分的亮度，默认30
			specular: 0x5d81a5, //高光部分的颜色
		});
		const floorMesh = new THREE.Mesh(floorGeometry1, material01);
		floorMesh.position.set(0, -0.01, 0);
		floorMesh.rotation.x = -THREE.MathUtils.degToRad(90);
		floorMesh.receiveShadow = true;
		scene.add(floorMesh);

		const groundMirror = new Reflector(floorGeometry, {
			clipBias: 0.3,
			textureWidth: 300,
			textureHeight: 300,
			color: 0x808080,
		});
		groundMirror.position.set(0, 0, 0);
		groundMirror.rotation.x = -THREE.MathUtils.degToRad(90);
		groundMirror.receiveShadow = true;

		//scene.add(groundMirror);

		let selects: any = [];
		objects.forEach((item) => {
			item.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					selects.push(obj);
				}
			});
		});
		console.log('------s', selects, objects);
		let ReflectorGeometry = new THREE.PlaneGeometry(100, 100);
		//const mergedGeometry = BufferGeometryUtils.mergeGeometries(selects);
		let groundReflector = new ReflectorForSSRPass(ReflectorGeometry, {
			clipBias: 0.0003,
			textureWidth: window.innerWidth,
			textureHeight: window.innerHeight,
			color: 0x888888,
			useDepthTexture: true,
		});
		groundReflector.material.depthWrite = false;
		groundReflector.rotation.x = -Math.PI / 2;
		groundReflector.visible = false;
		groundReflector.position.set(0, 0, 0);
		//scene.add(groundReflector);

		let composer = new EffectComposer(renderer);

		let ssrPass = new SSRPass({
			renderer,
			scene,
			camera,
			width: innerWidth,
			height: innerHeight,
			groundReflector: groundReflector,
			selects: selects,
		});

		composer.addPass(ssrPass);
		ssrPass.thickness = 0.018;
		ssrPass.infiniteThick = false;
		ssrPass.maxDistance = 0.1;
		groundReflector.maxDistance = 0.036;
		ssrPass.opacity = 0.35;
		groundReflector.opacity = 0.317;

		composer.addPass(new ShaderPass(GammaCorrectionShader));

		//添加网格
		const gridHelper = new THREE.GridHelper(4000, 1000, 0x0000ff, 0x808080);
		gridHelper.position.set(0, -1, 0);
		scene.add(gridHelper);

		//scene.position.set(30, -30, 0);
		//添加光源
		// const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
		// directionalLight.position.set(20, 70, 20);
		// directionalLight.target.position.set(0, 0, 0);
		// directionalLight.castShadow = true;
		// scene.add(directionalLight);
		// directionalLight.shadow.mapSize.set(4096, 4096);
		// directionalLight.shadow.camera.near = 0.01; // default
		// directionalLight.shadow.camera.far = 500; // default
		// directionalLight.shadow.camera.top = 500;
		// directionalLight.shadow.camera.bottom = -500;
		// directionalLight.shadow.camera.left = -500;
		// directionalLight.shadow.camera.right = 500;
		// directionalLight.shadow.radius = 10;

		// const light = new THREE.PointLight(0xffffff, 0.1, 50);
		// light.position.set(10, 10, 10);
		// light.castShadow = true; // default false
		// scene.add(light);
		// light.shadow.mapSize.width = 1024; // default
		// light.shadow.mapSize.height = 1024; // default
		// light.shadow.camera.near = 0.5; // default
		// light.shadow.camera.far = 500; // default
		// const spotLight = new THREE.SpotLight(0xffffff, 20, 20);
		// spotLight.position.set(0, 20, 20);
		// spotLight.target.position.set(0, 0, 0);
		// //spotLight.map = new THREE.TextureLoader().load(url);

		// spotLight.castShadow = true;

		// spotLight.shadow.mapSize.width = 1024;
		// spotLight.shadow.mapSize.height = 1024;

		// spotLight.shadow.camera.near = 0.3;
		// spotLight.shadow.camera.far = 50;
		// spotLight.shadow.camera.fov = 30;

		// scene.add(spotLight);
		// const ambient = new THREE.AmbientLight(0xffffff, 10);
		// scene.add(ambient);
		//添加一个长方体
		//添加天空

		//scene.background = new THREE.Color(0xa0a0a0);
		scene.fog = new THREE.Fog(0x808080, 10, 1000);
		const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 10);
		hemiLight.position.set(0, 100, 0);
		scene.add(hemiLight);
		const dirLight = new THREE.DirectionalLight(0xffffff, 10);
		const targetPosition = new THREE.Vector3(0, 0, -10);
		dirLight.target.position.copy(targetPosition);
		dirLight.position.set(-20, 40, 30);
		dirLight.castShadow = true;
		dirLight.shadow.camera.top = 50;
		dirLight.shadow.camera.bottom = -50;
		dirLight.shadow.camera.left = -50;
		dirLight.shadow.camera.right = 50;
		dirLight.shadow.camera.near = 0.1;
		dirLight.shadow.camera.far = 100;
		dirLight.shadow.mapSize.set(2048, 2048);
		scene.add(dirLight);
		//添加环境贴图
		// new RGBELoader().setPath('./equirectangular/').load('sky.hdr', function (texture) {
		// 	texture.mapping = THREE.EquirectangularReflectionMapping;
		// 	scene.background = texture;
		// 	scene.environment = texture;
		// });

		async function keepJson(json: any) {
			try {
				// 假设你有一个API端点 /api/data 用于接收JSON数据
				const response = await axios.post('', {models: json});
				console.log(response.data); // 输出服务器响应
			} catch (error) {
				console.error(error); // 输出错误信息
			}
		}

		//renderer.domElement.style.position = 'absolute';
		//renderer.domElement.style.display = 'flex';
		//renderer.antialias = true;
		canvas?.appendChild(renderer.domElement);
		css3dRenderer = new CSS3DRenderer();
		css3dRenderer.setSize(width, height);
		css3dContainer?.appendChild(css3dRenderer.domElement);
		orbit = new OrbitControls(camera, renderer.domElement);
		orbit.update();
		orbit.addEventListener('change', render);

		control = new TransformControls(camera, renderer.domElement);
		control.addEventListener('change', render);
		scene.add(control);
		control.addEventListener('dragging-changed', function (event) {
			orbit.enabled = !event.value;
		});
		//创建包围盒
		//box = new THREE.BoxHelper(object, 0xffff00);
		watch(modelCardStore.data, (newValue, oldValue) => {
			console.log('-----------cardstore', modelCardStore.data);
			let info: fullInfo = createInfo();
			info.path = newValue.path;
			info.modelInfo.name = newValue.name;
			const cardX = modelCardStore.data.posx;
			const cardY = modelCardStore.data.posy;
			const pos = getWorldPosition(new THREE.Vector2(cardX, cardY));
			info.modelInfo.posx = pos.x;
			info.modelInfo.posz = pos.y;
			info.modelInfo.posz = pos.z;
			infoArr.push(info);
			hierarchyStore.data[0].children.push({
				label: newValue.name,
				children: [],
			});
			loadGLTF(info, scene, objects);
		});
		watch(modelStore.modelData, (newValue, oldValue) => {
			updateModel(modelStore.modelData);
		});

		let oldArr: any[] = modelArr;
		//废弃
		watch(modelIDStore, (newValue, oldValue) => {
			const str = newValue.modelID;
			let arr = str.split('-');
			arr.forEach((item, index) => {
				oldArr = oldArr[parseInt(item)];
			});
		});
		watch(selectModelStore, (newValue, oldValue) => {
			const uuid = newValue.model.uuid;
			if (!uuid) return;
			objects.forEach((item) => {
				if (item.uuid == uuid) {
					initData(modelStore.modelData, selectModelStore.model.uuid);
					modelSelect = item;
					control.attach(modelSelect);
					if (controlMode) control.setMode(controlMode);
				}
			});
		});

		function updateModel(info: modelInfo) {
			if (modelSelect) {
				modelSelect.position.set(Number(info.posx), Number(info.posy), Number(info.posz));

				modelSelect.rotation.set(Number(info.rotx), Number(info.roty), Number(info.rotz));
				modelSelect.scale.set(Number(info.length), Number(info.height), Number(info.width));
				if (info.outline) {
					scene.remove(box);

					box = new THREE.BoxHelper(modelSelect, 0xffff00);

					box.setFromObject(modelSelect);

					scene.add(box);
				} else {
					scene.remove(box);
				}
				if (info.color) {
					console.log('------color', modelSelect);
					setColor(modelSelect, info.color);
				}
				//render();
			}
		}

		// controlsMap = new MapControls(camera, renderer.domElement);
		// controlsMap.enableDamping = true;
		//添加轨道控制器
		//const dragControls = new OrbitControls(camera, renderer.domElement);
		// dragControls.enableDamping = true;
		// dragControls.dampingFactor == 0.01;
		//createSSRPass(floorMesh);
		//添加拖拽控制器
		dragControls = new DragControls([...objects], camera, renderer.domElement);

		function animate() {
			requestAnimationFrame(animate);
			//controlsMap.update();
			renderer.render(scene, camera);
			css3dRenderer.render(scene, camera);
		}
		animate();
		// dragControls.addEventListener('drag', render);
		window.addEventListener('resize', onWindowResize);
		document.addEventListener('click', onClick);
		// window.addEventListener('keydown', onKeyDown);
		// window.addEventListener('keyup', onKeyUp);
		// dragControls.addEventListener('dragstart', onDragStart);
		// dragControls.addEventListener('dragend', onDragEnd);
		render();
	}
	function getWorldPosition(pos: THREE.Vector2): THREE.Vector3 {
		// 将鼠标位置转换为归一化设备坐标(-1 到 +1)
		mouse.x = (pos.x / window.innerWidth) * 2 - 1;
		mouse.y = -(pos.y / window.innerHeight) * 2 + 1;

		// 使用鼠标位置更新射线投射器
		raycaster.setFromCamera(mouse, camera);

		// 计算物体和射线的交点
		var intersects = raycaster.intersectObjects(scene.children);

		// 如果存在交点
		if (intersects.length > 0) {
			// 获取第一个交点的对象位置
			var intersectionPoint = intersects[0].point;
			return intersectionPoint;
			console.log('Clicked position:', intersectionPoint);
		}
		return new THREE.Vector3(0, 0, 0);
	}
	function setColor(root: any, color: string) {
		console.log('-------', root.name, root);
		if (root.type == 'Mesh') root.material.color.setHex(color);
		if (root.children) {
			root.children.forEach((item: any) => {
				setColor(item, color);
			});
		}
	}
	function hexToRgb(hex: string) {
		let r = 0,
			g = 0,
			b = 0;
		if (hex.length === 7) {
			r = parseInt(hex.slice(1, 3), 16);
			g = parseInt(hex.slice(3, 5), 16);
			b = parseInt(hex.slice(5, 7), 16);
		}
		return `rgb(${r}, ${g}, ${b})`;
	}
	function initData(info: modelInfo, uuid: string) {
		let param = {modelInfo: {uuid: '123'}, children: infoArr};
		let data = {data: Object()};
		readData(param, uuid, data);
		console.log('-------data', data.data.name);
		info.color = data.data.color;
		info.outline = data.data.outline;
		info.collision = data.data.collision;
	}
	function clickData(info: modelInfo) {
		info.name = modelSelect.userData.name;
		info.uuid = modelSelect.uuid;
		info.posx = modelSelect.position.x;
		info.posy = modelSelect.position.y;
		info.posz = modelSelect.position.z;
		info.rotx = modelSelect.rotation.x;
		info.roty = modelSelect.rotation.y;
		info.rotz = modelSelect.rotation.z;
		info.height = modelSelect.scale.y;
		info.width = modelSelect.scale.y;
		info.length = modelSelect.scale.y;
		let param = {modelInfo: {uuid: '123'}, children: infoArr};
		// let data = {data: Object()};
		// readData(param, selectModelStore.model.uuid, data);
		// console.log('-------data', data.data, modelSelect);
		// info.color = data.data.color;
		// info.outline = data.data.outline;
		// info.collision = data.data.collision;

		writeData(param, selectModelStore.model.uuid, info);
	}

	function onWindowResize() {
		// 计算新的相机视角或者位置
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		const width: any = window.innerWidth;
		const height: any = window.innerHeight;
		renderer.setSize(width, height);
		renderer.render(scene, camera);
		//ssrcomposer.setSize(width, height);
	}
	function delay(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	function addBox() {
		let boxGeo = new THREE.BoxGeometry(10, 10, 10, 50, 50, 50);
		let boxMat = new THREE.PointsMaterial({color: 0x51efe4, size: 0.1});
		let boxMesh = new THREE.Mesh(boxGeo, boxMat);
		scene.add(boxMesh);
	}
	function onDragStart() {
		controlsMap.enabled = false;
	}

	function onDragEnd() {
		controlsMap.enabled = true;

		if (intersections[0]) intersections[0].object.position.y = 0;
	}

	window.addEventListener('resize', () => {
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	});

	function onKeyDown(event: WindowEventMap['keydown']) {
		enableSelection = event.key === 'z' ? true : false;
		enableDrag = event.key === 'd' ? true : false;
		if (event.key === 'm') {
			dragControls.mode = dragControls.mode === 'translate' ? 'rotate' : 'translate';
		}
		if (event.key === 'z') dragControls.enabled = false;
	}

	function onKeyUp() {
		enableSelection = false;
		dragControls.enabled = true;
	}

	function onClick(event: WindowEventMap['click']) {
		event.preventDefault();
		const draggableObjects = dragControls.getObjects();
		draggableObjects.length = 0;
		mouse.x = ((event.clientX - left) / window.innerWidth) * 2 - 1;
		mouse.y = -((event.clientY - top) / window.innerHeight) * 2 + 1;
		//点击区域
		if (
			event.clientX > right ||
			event.clientX < left ||
			event.clientY < top ||
			event.clientY > bottom
		) {
			return;
		}

		raycaster.setFromCamera(mouse, camera);
		intersections = raycaster.intersectObjects(objects, true);
		if (intersections[0]) {
			modelSelect = findScene(intersections[0].object);
			console.log('----------modelSelect', modelSelect);
			selectModelStore.model.uuid = modelSelect.uuid;
			initData(modelStore.modelData, modelSelect.uuid);
			clickData(modelStore.modelData);
			control.attach(modelSelect);
		}

		if (enableSelection === true) {
			dragControls.enabled = false;
			if (object01.children.indexOf(intersections[0].object) !== -1) {
				marker.visible = !marker.visible;
			}
			const arr: any = intersections[0].object.parent?.children;
			arr.forEach((object: any) => {
				if (object.name == 'mk') {
					object.visible = !object.visible;
				}
			});

			if (intersections.length > 0) {
				// const object = intersections[0].object;
				// console.log('---------------', object);
				// if (group.children.includes(object) === true) {
				// 	object.material.emissive.set(0x000000);
				// 	scene.attach(object);
				// } else {
				// 	object.material.emissive.set(0xaaaaaa);
				// 	group.attach(object);
				// }
				// dragControls.transformGroup = true;
				// draggableObjects.push(group);
			}
			if (group.children.length === 0) {
				//dragControls.transformGroup = false;
			}
		}
		if (enableDrag) {
			draggableObjects.push(...objects);
		}
		render();
	}

	function render() {
		if (modelSelect) {
			clickData(modelStore.modelData);
		}
		if (ssrcomposer) {
			ssrcomposer.render();
		} else {
			renderer.render(scene, camera);
		}
		//requestAnimationFrame(render);
	}
});
function writeData(info: any, uuid: string, data: any) {
	if (info.modelInfo.uuid == uuid) {
		info.modelInfo.posx = data.posx;
		info.modelInfo.posy = data.posy;
		info.modelInfo.posz = data.posz;
		info.modelInfo.rotx = data.rotx;
		info.modelInfo.roty = data.roty;
		info.modelInfo.rotz = data.rotz;
		info.modelInfo.length = data.length;
		info.modelInfo.height = data.height;
		info.modelInfo.width = data.width;
		info.modelInfo.outline = data.outline;
		info.modelInfo.collision = data.collision;
		info.modelInfo.color = data.color;
		console.log('-=-==-=-=-=info', info);
	}
	if (info.children) {
		info.children.forEach((item: any) => {
			writeData(item, uuid, data);
		});
	} else {
		return -1;
	}
}
function readData(info: any, uuid: string, data: any) {
	if (info.modelInfo.uuid == uuid) {
		console.log('====data', info.modelInfo);

		data.data = info.modelInfo;
	}
	if (info.children) {
		console.log('-----');

		info.children.forEach((item: any) => {
			readData(item, uuid, data);
		});
	} else {
		return -1;
	}
}
function findScene(mesh: any): any {
	let group = mesh.parent;
	while (group.name !== 'Scene') {
		group = group.parent;
	}
	return group;
}
async function fetchData(url: string) {
	const response = await axios.get(url);

	return response.data;
}
const radio2 = ref('Los Angeles');
const deleteHandle = () => {
	console.log('---------delete');
};
const plusHandle = () => {
	console.log('---------plus');
};

const posHandle = () => {
	console.log('---------pos');
	control.setMode('translate');
	controlMode = 'translate';
};
const rotHandle = () => {
	console.log('---------rot');
	control.setMode('rotate');
	controlMode = 'rotate';
};
const sizeHandle = () => {
	console.log('---------size');
	control.setMode('scale');
	controlMode = 'scale';
};
</script>
<template>
	<div id="Canvas" class="canvas"></div>
	<div class="css3d"></div>

	<div class="button-view">
		<div style="width: 20px"></div>
		<el-button class="icon-button" type="primary" :icon="Delete" @click="deleteHandle" />
		<el-button class="icon-button" type="primary" :icon="Plus" @click="plusHandle" />
		<div style="width: 30px"></div>
		<el-button class="icon-button" id="pos1" type="primary" :icon="Rank" @click="posHandle" />
		<el-button class="icon-button" id="rot" type="primary" :icon="Refresh" @click="rotHandle" />
		<el-button
			class="icon-button"
			id="size"
			type="primary"
			:icon="FullScreen"
			@click="sizeHandle"
		/>
	</div>
	<div
		class="loading-view"
		v-loading="loading"
		element-loading-background="rgba(75, 75, 75, 0.7)"
	></div>
</template>
<style>
.loading-view {
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
	z-index: 200;
	pointer-events: none;
}
.el-radio-button {
	z-index: 120 !important;
}
.radio {
	z-index: 102;
}
.button-view {
	position: fixed;
	display: flex;
	height: 40px;
	z-index: 101;
}
.icon-button {
	z-index: 101;
	background: none;
	border-style: none;
	outline: none;
	cursor: pointer;
	width: 30px;
	height: 30px;
	padding: 0px;
	margin: 0px;
}
.icon-button:active {
	color: #409eff !important;
}
.canvas {
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
}
.css3d {
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 50;
	overflow: hidden;
}
.button-container {
	position: absolute;
}
.icon-button {
	background: none !important;
	border-style: none !important;
	outline: none !important;
	cursor: pointer !important;
	z-index: 100 !important;
}
.elementTag {
	position: relative;
	width: auto;
	height: auto;
	padding: 5px 10px;
	cursor: default;
	text-align: center;
	background-color: rgba(6, 126, 237, 0.5);
	border: 1px solid rgb(3, 120, 253, 0.5);
	box-shadow: 0 0 12px rgba(2, 70, 70, 0.5);
	color: rgba(127, 255, 255, 1);
	pointer-events: none;
}
.elementTag::before {
	content: '';
	display: block;
	position: absolute;
	width: 30px;
	height: 1px;
	background-color: rgb(3, 120, 253, 0.75);
	bottom: -1px;
	right: -31px;
	transform: rotate(70deg);
	transform-origin: 0 0;
}
.elementTag::after {
	content: '';
	display: block;
	position: absolute;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background-color: rgba(9, 118, 242);
	bottom: -30px;
	right: -13.2px;
	transform: rotate(30dezg);
	transform-origin: 0 0;
}
.elementContent h3 {
	font-size: 12px;
	font-weight: bold;
	color: #ffffff;
	margin: 0;
}
.elementContent p {
	font-size: 10px;
	color: aliceblue;
}
</style>
