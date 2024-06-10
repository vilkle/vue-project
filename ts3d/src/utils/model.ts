import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {CSS3DSprite} from 'three/examples/jsm/Addons.js';
import {useSelectModelStore} from '@/store/SelectModel';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

const loader = new GLTFLoader();

export async function loadGLTF(info: any, parent: any, objects: any[]) {
	//console.log(`./models/${info.path}/index.gltf`);
	return loader.loadAsync(`./models/${info.path}/index.gltf`).then((gltf: any) => {
		const box = new THREE.Box3().setFromObject(gltf.scene);
		const size = new THREE.Vector3();
		box.getSize(size);
		let len = size.y / 2;

		gltf.scene.position.set(0, 0, 0);
		const modelInfo = info.modelInfo;
		gltf.scene.position.set(modelInfo.posx, modelInfo.posy, modelInfo.posz);
		gltf.scene.rotation.set(modelInfo.rotx, modelInfo.roty, modelInfo.rotz);
		gltf.scene.scale.set(modelInfo.width, modelInfo.length, modelInfo.height);
		if (modelInfo.uuid) gltf.scene.uuid = modelInfo.uuid;
		if (modelInfo.name) gltf.scene.userData.name = modelInfo.name;
		let pos = gltf.scene.position;
		const marker = markerDom(info);
		gltf.scene.add(marker);
		objects.push(gltf.scene);
		marker.position.set(pos.x - 1, pos.y + 1, pos.z - 6);
		parent.add(gltf.scene);
		gltf.scene.traverse((child: any) => {
			if (child.type == 'Mesh') {
				child.castShadow = true; // 让模型投射阴影
				child.receiveShadow = true; // 让模型接受阴影
			}
		});
		const body = new CANNON.Body({
			mass: 1,
			shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
			position: new CANNON.Vec3(modelInfo.posx, modelInfo.posy + len, modelInfo.posz),
			linearDamping: 0.9,
		});
		body.quaternion.copy(gltf.scene.quaternion);
		gltf.scene.userData.body = body;
		if (modelInfo.uuid == '') {
			let selectModelStore = useSelectModelStore();
			selectModelStore.model.uuid = gltf.scene.uuid;
			selectModelStore.model.name = info.modelInfo.name;
		}
		//parent[id] = gltf.scene;
		//console.log(info.path, '---load', size, gltf);
	});
}
function markerDom(info: fullInfo): CSS3DSprite {
	let markerDom = document.createElement('div');
	markerDom.className = 'elementTag';
	markerDom.innerHTML = `
		<div class="elementContent">
			<h3>名称：${info.modelInfo.name}</h3>
			<p>温度：${info.displayInfo.temperature}</p>
			<p>湿度：${info.displayInfo.dampness}</p>
			</div>
		`;
	const marker = new CSS3DSprite(markerDom);
	marker.name = 'mk';
	marker.scale.set(0.09, 0.09, 0.09);
	marker.position.set(0, 6, 0);
	marker.visible = false;
	return marker;
}
