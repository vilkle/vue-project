<template>
	<div class="card-component">
		<el-row>
			<el-col class="card-panel-col">
				<el-card :body-style="{padding: '0px'}">
					<div class="image">
						<img :src="topUrl" onerror="" class="image" style="user-select: none" />
					</div>
					<div class="title">
						<span>{{ title }}</span>
					</div>
					<!--div class="button">
						<el-button
							type="text"
							class="add-button"
							@click="handleclick"
							style="margin-right: 10px"
							>添加</el-button
						>
					</div-->
				</el-card>
			</el-col>
		</el-row>
	</div>
</template>
<script lang="ts" setup>
// let topUrl = ref('./models/jianceche/cover.png');
// let title = ref('监测车');

interface Props {
	title?: string;
	topUrl?: string;
	path?: string;
}
const props = withDefaults(defineProps<Props>(), {
	title: '',
	topUrl: '',
	path: '',
});
const emit = defineEmits(['path']);

const handleclick = () => {
	emit('path', props);
};
</script>

<style scoped>
img {
	user-select: none; /* 设置不能选中图片 */
	-webkit-user-drag: none; /* 设置不能拖拽图片 */
	-moz-user-drag: none; /* 设置不能拖拽图片 */
	-ms-user-drag: none; /* 设置不能拖拽图片 */
}
.card-component {
	width: 150px;
	height: 120px;
	margin-left: 5px;
	margin-right: 5px;
}
.image {
	width: 150px;
	height: 100px;
}
.title {
	font-size: 14px;
	height: 20px;
	display: flex;
	justify-content: center;
}
.button {
	font-size: 13;
	height: 20px;
	display: flex;
	justify-content: right;
	align-items: center;
}
.image {
	width: 150px;
	min-height: 100%;
	margin-right: 16px;
	border-radius: 5px;
}
</style>
