import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 打包成单个 index.html（JS 内联），可直接双击打开，无需服务器
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
});
