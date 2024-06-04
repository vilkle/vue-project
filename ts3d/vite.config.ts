import {fileURLToPath, URL} from 'node:url';
import {defineConfig, loadEnv} from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
	const env = loadEnv(mode, process.cwd());
	return {
		plugins: [vue()],
		//反向代理解决跨域问题
		server: {
			host: '0.0.0.0',
			port: Number(env.VITE_APP_PORT),
			//运行时自动打开浏览器
			open: true,
			proxy: {
				[env.VITE_APP_BASE_API]: {
					target: env.VITE_APP_SERVICE_API,
					changeOrigin: true,
					rewrite: (path) =>
						path.replace(new RegExp('^' + env.VITE_APP_BASE_API), ''),
				},
			},
		},
		//配置路径别名
		resolve: {
			//@替代/src
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url)),
			},
		},
		//引入scss全局变量
		// css: {
		// 	preprocessorOptions: {
		// 		scss: {
		// 			additionalData:
		// 				'@import"@/styles/color.scss";@import"@/styles/theme.scss";',
		// 		},
		// 	},
		// },
	};
});
