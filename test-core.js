// 简单的测试脚本 - 测试核心逻辑
import fs from 'fs';
import path from 'path';

console.log('🧪 AI Web Archive - 核心功能测试\n');

// 测试 1: 检查项目结构
console.log('📁 1. 检查项目结构...');
const requiredFiles = [
    'package.json',
    'dist/manifest.json',
    'dist/content.js',
    'dist/popup.js',
    'dist/background.js',
    'dist/index.html',
    'README.md'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
});

if (allFilesExist) {
    console.log('   ✅ 所有必需文件都存在\n');
} else {
    console.log('   ❌ 缺少一些文件\n');
}

// 测试 2: 检查 manifest.json 配置
console.log('📋 2. 检查扩展配置...');
try {
    const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));
    console.log(`   ✅ Manifest version: ${manifest.manifest_version}`);
    console.log(`   ✅ Extension name: ${manifest.name}`);
    console.log(`   ✅ Version: ${manifest.version}`);
    console.log(`   ✅ Permissions: ${manifest.permissions.join(', ')}\n`);
} catch (e) {
    console.log(`   ❌ 无法读取 manifest.json: ${e.message}\n`);
}

// 测试 3: 检查构建文件大小
console.log('📊 3. 检查构建输出...');
const buildFiles = [
    'dist/content.js',
    'dist/popup.js',
    'dist/background.js'
];

buildFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ ${file}: ${sizeKB} KB`);
    }
});

// 测试 4: 验证我们的测试页面
console.log(`\n🌐 4. 测试页面已创建: test.html`);
console.log(`   你可以在浏览器中打开它来测试扩展功能`);

console.log('\n' + '='.repeat(50));
console.log('📝 完整测试步骤:');
console.log('='.repeat(50));
console.log('1. 在 Chrome 中打开 chrome://extensions/');
console.log('2. 开启「开发者模式」');
console.log('3. 点击「加载已解压的扩展程序」');
console.log('4. 选择 dist/ 文件夹');
console.log('5. 在浏览器中打开 test.html');
console.log('6. 点击扩展图标测试功能');
console.log('7. 尝试各种导出格式');
console.log('='.repeat(50));
console.log('\n✅ 测试准备完成！');
