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
import {getCurrentInstance, onMounted, onUnmounted, ref, watch} from 'vue';
//import jsonData from '@/json/info.json';
import {loadGLTF} from '../utils/model';
import axios from 'axios';
import {Delete, Plus, Rank, Refresh, FullScreen, WindPower, Clock} from '@element-plus/icons-vue';
import {ElButton, translate} from 'element-plus';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {useModelDataStore} from '@/store/modelData';
import {useSelectModelStore} from '@/store/SelectModel';
import {useHierarchyDataStore} from '@/store/hierarchyData';
import {useModelCardStore} from '@/store/modelCardData';
import {useInfoDataStore} from '@/store/infoData';
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
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import {TrefoilPolynomialKnot} from 'three/examples/jsm/curves/CurveExtras.js';

let marker: CSS3DSprite, object01: THREE.Group<THREE.Object3DEventMap>;
let orbit: OrbitControls;
let control: TransformControls;
let box: THREE.BoxHelper;
let modelStore = useModelDataStore();
let selectModelStore = useSelectModelStore();
let modelCardStore = useModelCardStore();
let hierarchyStore = useHierarchyDataStore();
let infoDataStore = useInfoDataStore();
let loading = ref(true);
let infoArr: any;
let controlMode: 'translate' | 'rotate' | 'scale';
let objects: THREE.Object3D<THREE.Object3DEventMap>[] = [];
let scene: THREE.Scene;
let cannonWorld: CANNON.World;
let clock: THREE.Clock;
let cannonDebugger: any;
let uuidArr: string[] = [];
let startX: number,
	startY: number,
	endX: number,
	endY: number,
	totalDistance = 0;
let groupArr: any[];
let watchHandle01: any, watchHandle02: any, watchHandle03: any, watchHandle04: any;
onMounted(async () => {
	let container;
	let camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
	let dragControls: DragControls;
	let controlsMap: MapControls;
	let enableSelection = false;
	let enableDrag = false;
	let group: THREE.Object3D;
	const mouse = new THREE.Vector2();
	const raycaster = new THREE.Raycaster();
	const raycasterPlane = new THREE.Raycaster();
	let plane: any;
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
		init();
		await sceneAddModels();
		worldAddBody();
		loading.value = false;
		// 当两个异步操作都完成后，加载结束
	} catch (error) {
		// 处理错误情况
		console.error(error);
	}

	function init() {
		clock = new THREE.Clock();
		group = new THREE.Object3D();
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
		//创建物理世界
		cannonWorld = new CANNON.World();
		cannonWorld.gravity.set(0, -9.8, 0);

		//添加地面
		// const plane = new THREE.Mesh(
		// 	new THREE.PlaneGeometry(200, 200),
		// 	new THREE.MeshPhongMaterial({color: 0xcbcbcb}),
		// );
		// plane.rotation.x = -Math.PI / 2;
		// plane.position.y = -0.0001;
		// scene.add(plane);
		//物理世界的地面
		const floorShape = new CANNON.Plane();
		const floorBody = new CANNON.Body();
		floorBody.mass = 0;
		floorBody.addShape(floorShape);
		floorBody.position.set(0, 0, 0);
		floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
		cannonWorld.addBody(floorBody);

		const floorGeometry = new THREE.PlaneGeometry(100, 100);
		const floorGeometry1 = new THREE.PlaneGeometry(100, 100);
		const material01 = new THREE.MeshPhongMaterial({
			color: 0x818181,
			shininess: 30, //高光部分的亮度，默认30
			specular: 0x5d81a5, //高光部分的颜色
		});
		plane = new THREE.Mesh(floorGeometry1, material01);
		plane.position.set(0, 0, 0);
		plane.rotation.x = -Math.PI / 2;
		plane.receiveShadow = true;
		scene.add(plane);
		//添加网格
		const gridHelper = new THREE.GridHelper(4000, 1000, 0x0000ff, 0x808080);
		gridHelper.position.set(0, -1, 0);
		scene.add(gridHelper);
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
		control.showX = true;
		control.showY = false;
		control.showZ = true;
		scene.add(control);
		control.addEventListener('dragging-changed', function (event) {
			orbit.enabled = !event.value;
		});

		// 监听鼠标移动事件
		//renderer.domElement.addEventListener('mousemove', onMouseMove, false);
		watchHandle01 = watch(infoDataStore.data, (newValue, oldValue) => {
			sceneRemoveModels();
			infoArr = newValue.models;
			sceneAddModels();
		});
		watchHandle02 = watch(modelCardStore.data, async (newValue, oldValue) => {
			console.log('-----------cardstore', modelCardStore.data);
			let info: fullInfo = createInfo();
			info.path = newValue.path;
			info.modelInfo.name = newValue.name;
			const cardX = modelCardStore.data.posx;
			const cardY = modelCardStore.data.posy;
			const pos = getWorldPosition(new THREE.Vector2(cardX, cardY));
			info.modelInfo.posx = pos.x;
			info.modelInfo.posy = pos.y;
			info.modelInfo.posz = pos.z;
			await loadGLTF(info, scene, objects); //.then((gltf: any) => {
			// 	cannonWorld.addBody(gltf.scene.userData.body);
			// });
			info.modelInfo.uuid = selectModelStore.model.uuid;
			console.log('------------arrrrr', info);

			infoArr.push(info);
			hierarchyStore.data[0].children.push({
				label: newValue.name,
				id: info.modelInfo.uuid,
				children: [],
			});
		});
		watchHandle03 = watch(modelStore.modelData, (newValue, oldValue) => {
			updateModel(modelStore.modelData);
		});

		watchHandle04 = watch(selectModelStore, (newValue, oldValue) => {
			const uuid = newValue.model.uuid;
			if (!uuid) return;
			objects.forEach(async (item) => {
				if (item.uuid == uuid) {
					initData(modelStore.modelData, selectModelStore.model.uuid);
					modelSelect = item;
					control.detach();
					control.attach(modelSelect);
					if (controlMode) control.setMode(controlMode);
				}
			});
		});
		async function findGroup(uuid: string, infoArr: any) {
			let on = false;
			for (let i = 0; i < infoArr.length; ++i) {
				const info = infoArr[i];
				await deepSearch(info, uuid);
				on = false;
			}
			async function deepSearch(root: any, id: string) {
				if (on) uuidArr.push(root.modelInfo.uuid);
				if (root.modelInfo.uuid == id) on = true;
				if (root.children) {
					for (let i = 0; i < root.children.length; ++i) {
						await deepSearch(root.children[i], id);
					}
					if (root.modelInfo.uuid == id) on = false;
				}
			}
		}
		function findObjects(idArr: any[]) {
			objects.forEach((item) => {
				if (idArr.indexOf(item.uuid) !== -1) groupArr.push(item);
			});
		}
		async function onMouseDown(event: WindowEventMap['mousedown']) {
			if (!uuidArr.length && modelSelect) {
				await findGroup(modelSelect.uuid, infoArr);
				findObjects(uuidArr);
			}
			startX = modelSelect.position.x;
			startY = modelSelect.position.z;
			console.log('------mousedown', groupArr);
		}
		function onMouseUp(event: WindowEventMap['mouseup']) {
			uuidArr = [];
			groupArr = [];
			startX = startY = 0;
		}
		async function onMouseMove(event: WindowEventMap['mousemove']) {
			if (!modelSelect) return;
			endX = modelSelect.position.x;
			endY = modelSelect.position.z;
			let distanceX = endX - startX;
			let distanceY = endY - startY;
			startX = modelSelect.position.x;
			startY = modelSelect.position.z;
			groupArr.forEach((item) => {
				item.position.x += distanceX;
				item.position.z += distanceY;
			});
		}
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
			let deltaTime = clock.getDelta();
			cannonWorld.step(1 / 60, deltaTime);
			updateModelBody();
			if (cannonDebugger) cannonDebugger.update();
		}
		animate();
		// dragControls.addEventListener('drag', render);
		window.addEventListener('resize', onWindowResize);
		document.addEventListener('click', onClick);
		// window.addEventListener('keydown', onKeyDown);
		// window.addEventListener('keyup', onKeyUp);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mousedown', onMouseDown);
		window.addEventListener('mouseup', onMouseUp);
		// dragControls.addEventListener('dragstart', onDragStart);
		// dragControls.addEventListener('dragend', onDragEnd);
		render();
	}
	async function sceneAddModels() {
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
			}
		}
	}
	function sceneRemoveModels() {
		worldRemoveBody();
		for (let i = 0; i < objects.length; ++i) {
			scene.remove(objects[i]);
			//清理纹理
			scene.traverse(function (child) {
				if (child instanceof THREE.Mesh) {
					child.material.dispose();
					if (Array.isArray(child.material)) {
						child.material.forEach((material) => material.dispose());
					}
				}
				if (child instanceof CSS3DSprite) {
					child.parent?.remove(child);
				}
			});
			//清理材质
			scene.traverse(function (child) {
				if (child instanceof THREE.Mesh) {
					if (child.material.map) child.material.map.dispose();
					if (child.material.lightMap) child.material.lightMap.dispose();
					if (child.material.bumpMap) child.material.bumpMap.dispose();
					if (child.material.normalMap) child.material.normalMap.dispose();
					if (child.material.specularMap) child.material.specularMap.dispose();
					if (child.material.envMap) child.material.envMap.dispose();
					if (child.material.reflectivityMap) child.material.reflectivityMap.dispose();
					if (child.material.alphaMap) child.material.alphaMap.dispose();
				}
			});
		}
		//清理渲染器占用资源
		renderer.clear(true, true, true);
	}
	function getWorldPosition(pos: THREE.Vector2): THREE.Vector3 {
		const box = canvas?.getBoundingClientRect();
		// 将鼠标位置转换为归一化设备坐标(-1 到 +1)
		/* eslint-disable */
		const mouse = new THREE.Vector2();
		mouse.x = ((pos.x - left) / box!.width) * 2 - 1;
		mouse.y = -((pos.y - top) / box!.height) * 2 + 1;
		/* eslint-disable */

		// 使用鼠标位置更新射线投射器
		raycasterPlane.setFromCamera(mouse, camera);

		// 计算物体和射线的交点
		var intersects1 = raycasterPlane.intersectObjects([plane], true);
		console.log('----------intersections', intersects1, plane, objects[0], mouse, pos);
		// 如果存在交点
		if (intersects1.length > 0) {
			// 获取第一个交点的对象位置
			var intersectionPoint = intersects1[0].point;
			console.log('Clicked position:', intersectionPoint);
			return intersectionPoint;
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
	function worldAddBody() {
		for (let i = 0; i < objects.length; ++i) {
			const body = objects[i].userData.body;
			cannonWorld.addBody(body);
		}
		cannonDebugger = CannonDebugger(scene, cannonWorld, {
			onInit(body: CANNON.Body, mesh: THREE.Mesh) {
				mesh.visible = true;
			},
		});
	}
	function worldRemoveBody() {
		for (let i = 0; i < objects.length; ++i) {
			const body = objects[i].userData.body;
			cannonWorld.removeBody(body);
		}
	}
	function updateModelBody() {
		for (let i = 0; i < objects.length; ++i) {
			const body = objects[i].userData.body;
			const scene = objects[i];
			const box = new THREE.Box3().setFromObject(scene);
			const size = new THREE.Vector3();
			box.getSize(size);
			const len = size.y / 2;
			body.position.set(scene.position.x, scene.position.y + len, scene.position.z);
			//body.quaternion.copy(scene.quaternion);
			if (scene.position.x !== body.position.x || scene.position.y !== body.position.y) {
				scene.position.set(body.position.x, body.position.y - len, body.position.z);
				scene.quaternion.copy(body.quaternion);
			}
			// if (scene.quaternion !== body.quaternion) {
			// 	scene.quaternion.copy(body.quaternion);
			// }
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
		const box = canvas?.getBoundingClientRect();
		mouse.x = ((event.clientX - left) / box!.width) * 2 - 1;
		mouse.y = -((event.clientY - top) / box!.height) * 2 + 1;
		//updateModelBody();
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

		console.log('----------onflick', event.clientX, event.clientY, intersections, plane);
		if (intersections.length) {
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
		}
		if (enableDrag) {
			draggableObjects.push(...objects);
		}
		render();
	}

	async function render() {
		if (modelSelect) {
			clickData(modelStore.modelData);
		}
		renderer.render(scene, camera);
		//更新物理世界
		//updateModelBody();
		//requestAnimationFrame(render);
		//组拖拽
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
		//console.log('-=-==-=-=-=info', info);
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
		//console.log('====data', info.modelInfo);

		data.data = info.modelInfo;
	}
	if (info.children) {
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
	const uuid = selectModelStore.model.uuid;
	deleteHierarchyById(hierarchyStore.data, uuid);
	for (let i = 0; i < objects.length; ++i) {
		if (objects[i].uuid == uuid) {
			control.detach();
			scene.remove(objects[i]);
			objects.splice(i, 1);
		}
	}
	console.log('---------delete', uuid, objects, hierarchyStore.data[0]);
};
function deleteHierarchyById(arr: any, uuid: any) {
	for (let i = 0; i < arr.length; ++i) {
		if (arr[i].id == uuid) {
			arr.splice(i, 1);
			return;
		}
		if (arr[i].children.length) {
			deleteHierarchyById(arr[i].children, uuid);
		}
	}
}

const plusHandle = () => {
	console.log('---------plus');
};

const posHandle = () => {
	control.setMode('translate');
	control.showX = true;
	control.showY = false;
	control.showZ = true;
	controlMode = 'translate';
};
const rotHandle = () => {
	control.setMode('rotate');
	controlMode = 'rotate';
};
const sizeHandle = () => {
	control.setMode('scale');
	controlMode = 'scale';
};
onUnmounted(() => {
	watchHandle01 && watchHandle01();
	watchHandle02 && watchHandle02();
	watchHandle03 && watchHandle03();
	watchHandle04 && watchHandle04();
});
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
