NODE_ENV='prod';
// #为了防止意外地将一些环紧个变量泄漏到客户端只有，只有以VITE_为前缀的变量才会暴露给经过vite处理代码
// #js通过‘import.meta.env.VITE_APP_BASE_API’取值
VITE_APP_PORT = 5173;
VITE_APP_BASE_API = '/prod-api';
VITE_APP_BASE_FILE_API = '/prod-api/web/api/system/file/upload';

// #后端服务地址
VITE_APP_SERVICE_API = 'http://localhost:5555';
