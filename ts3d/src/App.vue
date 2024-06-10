<script lang="ts">
export default {
	name: 'App',
};
</script>

<script setup lang="ts">
import {onBeforeMount, onMounted, reactive, ref, render, toRaw, watch, type Ref} from 'vue';
import {useModelDataStore} from './store/modelData';
import {useSelectModelStore} from './store/SelectModel';
import {useHierarchyDataStore} from './store/hierarchyData';
import {useModelCardStore} from './store/modelCardData';
import {useInfoDataStore} from './store/infoData';
import type Node from 'element-plus/es/components/tree/src/model/node';
import type {DragEvents} from 'element-plus/es/components/tree/src/model/useDragNode';
import type {AllowDropType, NodeDropType} from 'element-plus/es/components/tree/src/tree.type';
import router from './router';
import {useRoute, useRouter} from 'vue-router';
import ModelCard from './components/ModelCard.vue';
//import jsonData from 'json/info.json';
//import modelPath from './json/model.json';
import axios from 'axios';
import {vec2} from 'three/examples/jsm/nodes/Nodes.js';
import {saveAs} from 'file-saver';

let loading = ref(true);
let infoArr: any = [];
let selectName: any = {name: ''};
let selectModelStore = useSelectModelStore();
let hierarchyStore = useHierarchyDataStore();
let modelCardStore = useModelCardStore();
let infoDataStore = useInfoDataStore();

function inputHandle(file: any, fileList: any) {
	loading.value = true;
	// 创建一个FileReader对象
	const reader = new FileReader();
	reader.onload = (e: any) => {
		// 在这里处理文件内容，例如保存到本地
		const content = e.target.result;
		let resBlob = new Blob([content]);
		let reader: FileReader = new FileReader();
		reader.readAsText(resBlob, 'utf-8');
		reader.onload = async (e: any) => {
			let res = JSON.parse(e.target.result);
			if (!infoDataStore.data.reload) infoDataStore.data.reload = true;
			infoDataStore.data.models = res;
			initHierarchyByInfo(infoDataStore.data.models);
			console.log('------infoDataStore', JSON.parse(e.target.result), infoDataStore.data);
			loading.value = false;
		};
	};
	reader.readAsArrayBuffer(file.raw);
}
function outputHandle() {
	const data = JSON.stringify(infoArr);
	const blob = new Blob([data], {type: 'application/json;charset=utf-8'});
	saveAs(blob, '模型.json');
}
const cardDragStart = (event: any) => {
	event.event.target.classList.add('dragging');
};
const cardDragEnd = (event: any) => {
	console.log('--------carddragend', event.event, event.path);
	modelCardStore.data.path = event.path;
	modelCardStore.data.posx = event.event.clientX;
	modelCardStore.data.posy = event.event.clientY;
	modelCardStore.data.name = event.name;
	event.event.target.classList.remove('dragging');
};
const cardDrop = (e: any) => {
	console.log('--------carddrop', e);
};
const handleClick01 = (node: Node) => {
	console.log('---------node', node);

	const id = node.id.toString();
	getNameById(id, selectName);
	selectModelStore.model.uuid = id;
	selectModelStore.model.name = selectName.name;

	console.log('handleClick', node, node.getChildren, node.id, selectName);
};
function getNameById(id: string, select: any) {
	infoArr.forEach((item: any) => {
		deepSearchName(item, id, select);
	});
}
function deepSearchName(root: any, id: string, select: any) {
	const name = root.modelInfo.name;
	const uuid = root.modelInfo.uuid;
	if (id == uuid) select.name = name;

	if (root.children) {
		root.children.forEach((item: any) => {
			deepSearchName(item, id, select);
		});
	}
}
const handleDragStart = (node: Node, ev: DragEvents) => {
	console.log('drag start', node);
};
const handleDragEnter = (draggingNode: Node, dropNode: Node, ev: DragEvents) => {
	console.log('tree drag enter:', dropNode.label);
};
const handleDragLeave = (draggingNode: Node, dropNode: Node, ev: DragEvents) => {
	console.log('tree drag leave:', dropNode.label);
};
async function AdjustingInfoStructure(sourceId: string, targetId: string) {
	let hierarchyArr = hierarchyStore.data[0].children;
	let sourceInfo: any = {};
	let index: number = 0;
	let parentId: string = '';
	let pid: string = '';
	let rindex: number = 0;
	//搜索注入信息
	await deepSearch(sourceId, infoArr);
	//搜索信息注入位置
	await searchIndex(sourceId, hierarchyArr);
	//注入信息
	await deepInsert(targetId, infoArr);
	//删除旧信息
	await deepRemove(parentId, infoArr);
	console.log('---------adjusting', parentId, rindex);

	async function searchIndex(id: string, arr: any[]) {
		for (let i = 0; i < arr.length; ++i) {
			const info = arr[i];
			if (info.id == id) {
				index = i;
			}
			if (info.children.length) await searchIndex(id, info.children);
		}
	}
	async function deepSearch(id: string, arr: any[]) {
		for (let i = 0; i < arr.length; ++i) {
			const info = arr[i];
			if (info.modelInfo.uuid == id) {
				sourceInfo = info;
				parentId = pid;
				rindex = i;
				break;
			}
			pid = info.modelInfo.uuid;
			if (info.children.length) await deepSearch(id, info.children);
		}
		pid = '';
	}
	async function deepInsert(id: string, arr: any[]) {
		for (let i = 0; i < arr.length; ++i) {
			const info = arr[i];
			if (info.modelInfo.uuid == id) {
				arr[i].children[index] = sourceInfo;
			}
			if (info.children.length) await deepInsert(id, info.children);
		}
	}
	async function deepRemove(id: string, arr: any[]) {
		if (id == '') {
			arr.splice(rindex, 1);
		}
		for (let i = 0; i < arr.length; ++i) {
			const info = arr[i];
			if (info.modelInfo.uuid == id) {
				arr[i].children.splice(rindex, 1);
			}
			if (info.children.length) await deepRemove(id, info.children);
		}
	}
}
const handleDragOver = (draggingNode: Node, dropNode: Node, ev: DragEvents) => {
	console.log('tree drag over:', dropNode.label);
};
const handleDragEnd = async (
	draggingNode: Node,
	dropNode: Node,
	dropType: NodeDropType,
	ev: DragEvents,
) => {
	console.log('tree drag end:', dropNode.data.id, draggingNode.data.id, dropType);
	infoArr = infoDataStore.data.models;
	await AdjustingInfoStructure(draggingNode.data.id, dropNode.data.id);
	infoDataStore.data.reload = false;
	infoDataStore.data.models = infoArr;
	console.log('---------infoarr', infoArr, hierarchyStore.data);
};
const handleDrop = (draggingNode: Node, dropNode: Node, dropType: NodeDropType, ev: DragEvents) => {
	console.log('tree drop:', dropNode.label, dropType);
};
const allowDrop = (draggingNode: Node, dropNode: Node, type: AllowDropType) => {
	if (dropNode.data.label === 'Level two 3-1') {
		return type !== 'inner';
	} else {
		return true;
	}
};
const allowDrag = (draggingNode: Node) => {
	return !draggingNode.data.label.includes('Level three 3-1-1');
};

function deepSearch(root: any, parent: any[], index: number, parentKey: string) {
	let id = '';
	if (parentKey) {
		id = `${parentKey}-${index}`;
	} else {
		id = `${index}`;
	}

	const item = {
		label: root.modelInfo.name,
		id: root.modelInfo.uuid,
		children: [],
	};

	parent.push(item);
	if (root.children) {
		root.children.forEach((child: any, key: any) => {
			deepSearch(child, parent[index].children, key, id);
		});
	}
}
function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function handleClick() {
	console.log('--------------');
	// const router = useRouter();
	// router.push('/three');
}
//路由刷新同步navigate
const paths = ['/test', '/login', '/three'];
const currentPath = router.currentRoute.value;
router.push(currentPath);
const tabsSelect = (key: string, keyPath: string[]) => {
	router.push(paths[parseInt(key) - 1]);
};
let modelStore = useModelDataStore();
let pathArr = ref<any[]>([]);
interface Item {
	label: string;
	children: any[];
}
// let data = reactive([
// 	{
// 		label: '场景',
// 		id: '-1',
// 		children: [],
// 	},
// ]);

let userData = reactive({
	userID: '',
	data: '',
});
let activeIndex = ref('1');
onMounted(async () => {
	try {
		const result01 = await fetchData('./json/model.json');
		const modelPath = result01;

		const result02 = await fetchData('./json/info.json');
		infoArr = result02.models;
		infoDataStore.data = {models: infoArr, reload: true};
		modelPath.path.forEach((item: any) => {
			pathArr.value.push(item);
		});
		initHierarchyByInfo(infoArr);
		await delay(500);
		// 当两个异步操作都完成后，加载结束
		loading.value = false;
	} catch (error) {
		// 处理错误情况
		console.error(error);
	}
});
function initHierarchyByInfo(infoArr: any) {
	hierarchyStore.data[0].children = [];
	//加载树节点
	for (let i = 0; i < infoArr.length; ++i) {
		const info = infoArr[i];

		deepSearch(info, hierarchyStore.data[0].children, i, '');
	}
}
async function fetchData(url: string) {
	const response = await axios.get(url);
	console.log('------------infoArr', response.data);

	return response.data;
}
function projectClick(node: any) {
	console.log('--------project', node.title);
	modelCardStore.data.name = node.title;
	modelCardStore.data.path = node.path;
}
</script>

<template>
	<div class="app" v-loading="loading" element-loading-background="rgba(75, 75, 75, 0.7)">
		<div class="navigate">
			<el-menu
				:default-active="activeIndex"
				class="navigate-menu"
				mode="horizontal"
				text-color="#ffffff"
				:ellipsis="false"
				@select="tabsSelect"
				style="width: 100%; height: 35px; background-color: 0x191919"
			>
				<el-menu-item index="0">
					<img style="width: 25px; height: auto" src="../src/assets/logo.svg" alt="Element logo" />
				</el-menu-item>
				<div class="flex-grow" style="background-color: rgb(29, 29, 29)" />
				<el-menu-item index="1">页面</el-menu-item>
				<el-menu-item index="2">页面</el-menu-item>
				<el-menu-item index="3">场景</el-menu-item>
				<el-sub-menu index="4">
					<template #title>模型</template>
					<el-menu-item index="4-1">item one</el-menu-item>
					<el-menu-item index="4-2">item two</el-menu-item>
					<el-menu-item index="4-3">item three</el-menu-item>
					<el-sub-menu index="4-4">
						<template #title>item four</template>
						<el-menu-item index="4-4-1">item one</el-menu-item>
						<el-menu-item index="4-4-2">item two</el-menu-item>
						<el-menu-item index="4-4-3">item three</el-menu-item>
					</el-sub-menu>
				</el-sub-menu>
				<div class="flex-grow0" style="flex-grow: 1; background-color: rgb(29, 29, 29)" />

				<el-upload
					ref="upload"
					action="#"
					accept=".json"
					:on-change="inputHandle"
					:auto-upload="false"
					style="background-color: rgb(29, 29, 29)"
				>
					<el-button
						class="menubutton"
						style="
							margin-top: 5px;
							color: white;
							background: none;
							background-color: rgb(29, 29, 29);
							border-style: none;
							outline: none;
							cursor: pointer;
							font-size: 14px;
							font-family: '宋体' !important;
						"
						slot="trigger"
						size="small"
						type="primary"
						>导入</el-button
					>
				</el-upload>
				<div class="flex-grow0" style="width: 5px; background-color: rgb(29, 29, 29)" />
				<button
					class="menubutton"
					style="
						color: white;
						background: none;
						background-color: rgb(29, 29, 29);
						border-style: none;
						outline: none;
						cursor: pointer;
						font-size: 14px;
						font-family: '宋体' !important;
					"
					:onclick="outputHandle"
				>
					导出
				</button>
				<div class="flex-grow01" style="width: 30px; background-color: rgb(29, 29, 29)" />
			</el-menu>
		</div>
		<div class="view">
			<div class="hierarchy">
				<el-scrollbar height="550px" width="300px">
					<div class="scrollbar-flex-content" style="display: flex">
						<el-tree
							class="hierarchy-tree"
							style="
								max-width: 300px;
								font-size: 13px;
								background-color: rgb(100, 100, 100);
								color: #409eff;
								padding-bottom: 30px;
								padding-right: 10px;
							"
							:allow-drop="allowDrop"
							:allow-drag="allowDrag"
							:expand-on-click-node="false"
							:data="hierarchyStore.data"
							draggable
							default-expand-all
							node-key="id"
							@node-drag-start="handleDragStart"
							@node-drag-enter="handleDragEnter"
							@node-drag-leave="handleDragLeave"
							@node-drag-over="handleDragOver"
							@node-drag-end="handleDragEnd"
							@node-drop="handleDrop"
							@node-click="handleClick01"
						/>
					</div>
				</el-scrollbar>
			</div>
			<div class="main-content" ondrop="cardDrop">
				<RouterView class="router"></RouterView>
			</div>
			<div class="inspector">
				<el-tabs type="border-card" class="el-tabs" style="background-color: rgb(100, 100, 100)">
					<el-tab-pane label="属性">
						<table>
							<tr>
								<p></p>
							</tr>
							<tr>
								<td>
									<label for="username">名称：</label>
								</td>
								<td>
									<el-input
										id="username"
										v-model="modelStore.modelData.name"
										style="width: 150px"
										size="small"
										placeholder="Please Input"
									/>
								</td>
							</tr>
							<tr>
								<td>
									<label for="uuid">uuid：</label>
								</td>
								<td>
									<el-input
										id="uuid"
										v-model="modelStore.modelData.uuid"
										style="width: 150px"
										size="small"
										placeholder="Please Input"
									/>
								</td>
							</tr>
						</table>
						<table>
							<tr>
								<p></p>
							</tr>
							<tr>
								<label>位置</label>
							</tr>
							<tr>
								<td>
									<label for="posx">X：</label>
									<el-input
										id="posx"
										v-model="modelStore.modelData.posx"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
								<td>
									<label for="posy"> Y：</label>
									<el-input
										id="posy"
										v-model="modelStore.modelData.posy"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
								<td>
									<label for="posz"> Z：</label>
									<el-input
										id="posz"
										v-model="modelStore.modelData.posz"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
							</tr>
							<tr>
								<label>旋转</label>
							</tr>
							<tr>
								<td>
									<label for="rotx">X：</label>
									<el-input
										id="rotx"
										v-model="modelStore.modelData.rotx"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
								<td>
									<label for="roty">Y：</label>
									<el-input
										id="roty"
										v-model="modelStore.modelData.roty"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
								<td>
									<label for="rotz">Z：</label>
									<el-input
										id="rotz"
										v-model="modelStore.modelData.rotz"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
							</tr>
							<tr>
								<label>缩放</label>
							</tr>
							<tr>
								<td>
									<label for="length">长：</label>
									<el-input
										id="length"
										v-model="modelStore.modelData.length"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
								<td>
									<label for="width">宽：</label>
									<el-input
										id="width"
										v-model="modelStore.modelData.length"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
								<td>
									<label for="height">高：</label>
									<el-input
										id="height"
										v-model="modelStore.modelData.length"
										style="width: 50px"
										size="small"
										placeholder="Please Input"
										type="number"
										oninput="if(isNaN(value)){value=parseFloat(value)} if(value.indexOf('.')>0){value=value.slice(0,value.indexOf('.')+3)}"
									/>
								</td>
							</tr>
						</table>
						<table>
							<tr>
								<p></p>
							</tr>
							<tr>
								<td>
									<label>是否可交互：</label>
									<el-switch
										v-model="modelStore.modelData.alternate"
										inline-prompt
										active-text="是"
										inactive-text="否"
										active-color="#B0BE2"
									/>
								</td>
							</tr>
							<tr>
								<td>
									<label>是否描边：</label>
									<el-switch
										v-model="modelStore.modelData.outline"
										inline-prompt
										active-text="是"
										inactive-text="否"
										active-color="#B0BE2"
									/>
								</td>
							</tr>
							<tr>
								<td>
									<label>是否添加碰撞：</label>
									<el-switch
										v-model="modelStore.modelData.collision"
										inline-prompt
										active-text="是"
										inactive-text="否"
										active-color="#B0BE2"
									/>
								</td>
							</tr>
							<tr>
								<p></p>
							</tr>
							<tr>
								<td>
									<label>颜色：</label>
									<el-color-picker v-model="modelStore.modelData.color" />
								</td>
							</tr>
						</table>
					</el-tab-pane>
					<el-tab-pane label="材质">Config</el-tab-pane>
					<el-tab-pane label="数据">
						<table>
							<tr>
								<p></p>
							</tr>
							<tr>
								<label>UserData</label>
							</tr>
							<tr>
								<td>
									<label for="userid">UserID：</label>
								</td>
								<td>
									<el-input
										id="userid"
										v-model="userData.userID"
										style="width: 150px"
										size="small"
										placeholder="Please Input"
									/>
								</td>
							</tr>
							<tr>
								<td>
									<label for="userdata">Data：</label>
								</td>
								<td>
									<el-input
										id="userdata"
										v-model="userData.data"
										style="width: 150px"
										size="small"
										placeholder="Please Input"
									/>
								</td>
							</tr>
						</table>
					</el-tab-pane>
					<el-tab-pane label="样式">Task</el-tab-pane>
				</el-tabs>
			</div>
		</div>

		<div class="project">
			<el-scrollbar class="project-scrollbar">
				<div class="ProjectContent">
					<ModelCard
						class="list"
						v-for="item in pathArr"
						:path="item.path"
						:title="item.name"
						:topUrl="`./models/${item.path}/cover.png`"
						style="align-items: center"
						@path="projectClick"
						draggable="true"
						@dragstart="cardDragStart({event: $event, path: item.path, name: item.name})"
						@dragend="cardDragEnd({event: $event, path: item.path, name: item.name})"
					></ModelCard>
				</div>
			</el-scrollbar>
		</div>
		<!--div>
			<p>{{ infoStore.text }}</p>
			<section>
				<input v-model="infoStore.text" value="888" />
			</section>
		</div-->
	</div>
</template>

<style>
.dragging {
	opacity: 0.3;
}
.project-scrollbar {
	width: inherit;
}
.el-scrollbar__thumb {
	height: 100px;
}
.ProjectContent {
	display: flex;
}
.menubutton:active {
	color: #409eff !important;
}
.label {
	font-size: 10px;
}
tr {
	line-height: 30px;
}
.el-menu {
	background-color: rgb(29, 29, 29);
	border-bottom: 1px solid rgb(74, 74, 74) !important;
}

.el-menu-item {
	background-color: rgb(29, 29, 29) !important;
}
.el-sub-menu__title.el-tooltip__trigger.el-tooltip__trigger {
	background-color: rgb(29, 29, 29) !important;
}
.el-sub-menu__title.el-tooltip__trigger.el-tooltip__trigger:hover {
	background-color: rgb(74, 74, 74) !important;
}
.el-menu--horizontal .el-menu-item:not(.is-disabled):focus,
.el-menu--horizontal .el-menu-item:not(.is-disabled):hover {
	background-color: rgb(74, 74, 74) !important;
}
.el-menu--popup {
	background-color: rgb(29, 29, 29) !important;
	border: 0px !important;
}
::v-deep .el-sub-menu .el-menu--popup {
	border-radius: 0 !important;
	margin: 0 !important;
	box-shadow: none !important;
}
.el-tree-node__content:hover {
	background-color: #525252 !important;
}
.el-tree-node:focus > .el-tree-node__content {
	background-color: #404040 !important;
}
.scrollbar-flex-content {
	display: flex;
}
.flex-grow {
	width: 150px;
}
body {
	margin: 0px;
	padding: 0px;
}
h3 {
	height: 30px;
	margin: 0 0 auto;
}
.hierarchy {
	border: 0.5px solid;
	border-color: rgb(73, 73, 73);
	color: aliceblue;
	background-color: rgb(100, 100, 100);
	width: 220px;
	height: 77vh;
}
.hierarchy-tree {
	width: 220px;
	margin: 10px;
	color: rgb(81, 82, 82);
	background-color: rgb(100, 100, 100);
}
.el-tree {
	margin: 0;
	background-color: rgb(100, 100, 100);
}
.inspector {
	height: 77vh;
	font-size: 12px;
	border: 0.5px solid;
	border-color: rgb(73, 73, 73);
	color: rgb(216, 216, 216);
	background-color: rgb(100, 100, 100);
}
.el-tabs__item.is-active {
	background-color: rgb(100, 100, 100) !important;
}
.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active {
	border-left-color: rgb(77, 77, 77) !important;
	border-right-color: rgb(77, 77, 77) !important;
}
.el-tabs__item {
	background-color: rgb(77, 77, 77) !important;
}
.el-tabs {
	width: inherit !important;
	height: inherit !important;
}
.el-tabs__header .el-tabs__item {
	height: 30px;
}
.el-tabs--border-card {
	border: 0px solid !important;
}

.project {
	color: aliceblue;
	flex-grow: 1;
	display: flex;
	justify-content: left;
	align-items: center;
	margin-top: -0.5px;
	padding-left: 5px;
	padding-right: 5px;
	padding-top: 7px;
	padding-bottom: 2px;
	width: inherit;
	height: 127px;
	overflow: hidden;
	border: 1px solid;
	border-color: rgb(73, 73, 73);
	background-color: rgb(73, 73, 73);
}
.router {
	top: 0px;
	left: 0px;
	position: absolute;
	margin: 0 auto;
	width: inherit;
	height: inherit;
}
.app {
	display: flex;
	flex-direction: column;
	background-color: rgb(0, 0, 0);
	width: inherit;
	height: inherit;
}
.navigate {
	width: inherit;
	display: flex;
	color: rgb(255, 255, 255);
	background-color: rgb(97, 97, 97);
}

.view {
	display: flex;
	flex-grow: 1;
	overflow: hidden;
}
.main-content {
	position: relative;
	display: flex;
	width: 100vh;
	height: 77vh;
	flex-grow: 1;
	overflow: hidden;
	background-color: rgb(100, 100, 100);
}
</style>
