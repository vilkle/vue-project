import {createRouter, createWebHistory} from 'vue-router';
import LoginPage from '@/pages/LoginPage.vue';
import IndexPage from '@/pages/IndexPage.vue';
import NotFoundPage from '@/pages/NotFoundPage.vue';
import ThreeScenePage from '@/pages/ThreeScenePage.vue';
import {KeepAlive} from 'vue';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			redirect: '/test',
		},
		{
			path: '/three',
			component: ThreeScenePage,
			meta: {
				KeepAlive: false,
			},
		},
		{
			path: '/login',
			component: LoginPage,
		},
		{
			path: '/test',
			component: IndexPage,
		},
		{
			path: '/lost',
			component: NotFoundPage,
		},
	],
});

export default router;
