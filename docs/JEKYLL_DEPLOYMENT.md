# Jekyll 部署指南 - GitHub Pages

本文档说明如何将China Medical Tour网站部署到GitHub Pages。

## 项目结构

我们的网站已转换为Jekyll格式,结构如下:

```
chinamedicaltour/
├── _config.yml              # Jekyll配置文件
├── _layouts/
│   └── default.html         # 页面布局模板
├── _includes/
│   ├── header.html          # 页眉组件(含Logo)
│   ├── footer.html          # 页脚组件(含Logo)
│   └── modals.html          # 模态框组件
├── assets/
│   ├── css/
│   │   └── style.css        # 自定义样式
│   ├── js/
│   │   ├── main.js          # 主页JavaScript
│   │   ├── translations.js  # 翻译数据
│   │   ├── planner.js       # 文化规划器逻辑
│   │   └── planner-data.js  # 规划器数据
│   └── images/
│       ├── logo.png         # 网站Logo
│       └── ...              # 其他图片
├── index.html               # 首页(Jekyll模板)
├── packages.html            # 医疗套餐页面
├── stories.html             # 患者故事页面
├── culture-planner.html     # 文化规划器页面
├── sitemap.xml              # 站点地图
└── robots.txt               # 搜索引擎配置
```

## 什么是Jekyll模板格式?

### Front Matter (头部声明)
每个页面顶部都有YAML格式的元数据:

```html
---
layout: default
title: China Medical Tour | Save 70% on High-End Medical Checkups & Travel
description: 网站描述
---
```

### Liquid标签
Jekyll使用Liquid模板语言实现动态内容:

```html
<!-- 包含组件 -->
{% include header.html %}

<!-- 使用变量 -->
<title>{{ page.title }}</title>

<!-- 生成相对路径 -->
<img src="{{ '/assets/images/logo.png' | relative_url }}">
<a href="{{ '/#about' | relative_url }}">About Us</a>
```

## Jekyll的好处

1. **代码复用** - Header/Footer只写一次,自动应用到所有页面
2. **易于维护** - 修改`_includes/header.html`,全站同步更新
3. **GitHub Pages原生支持** - 推送代码自动构建,无需手动编译
4. **SEO友好** - 生成干净的静态HTML

## 部署到GitHub Pages

### 方法一:直接推送 (推荐)

```bash
# 1. 确保您的仓库已配置好远程地址
git remote -v

# 2. 添加所有文件
git add .

# 3. 提交
git commit -m "Convert to Jekyll template format with logo"

# 4. 推送到GitHub
git push origin main
```

GitHub会自动检测Jekyll项目并构建网站。

### 方法二:配置GitHub Pages设置

1. 访问仓库: https://github.com/sjiangtao2024/chinamedicaltour
2. 点击 **Settings** → **Pages**
3. 在 **Source** 下选择:
   - Branch: `main`
   - Folder: `/ (root)`
4. 点击 **Save**

几分钟后,网站将在 `https://sjiangtao2024.github.io/chinamedicaltour/` 上线。

## 本地测试 (可选)

如果您想在推送前本地预览:

### 安装Jekyll

**Windows**:
```powershell
# 1. 安装Ruby (从 https://rubyinstaller.org/ 下载)
# 2. 打开命令提示符,安装Jekyll
gem install jekyll bundler
```

**Mac/Linux**:
```bash
gem install jekyll bundler
```

### 运行本地服务器

```bash
# 在项目根目录运行
cd c:\dev_code\chinamedicaltour
jekyll serve

# 访问 http://localhost:4000
```

## 重要文件说明

### `_config.yml`
Jekyll的核心配置文件,包含:
- 网站标题和描述
- URL设置
- 构建选项

### `_layouts/default.html`
所有页面的基础布局,包含:
- HTML `<head>` 部分(meta标签、CSS链接、scripts)
- `{% include header.html %}` - 插入页眉
- `{{ content }}` - 页面主内容占位符
- `{% include footer.html %}` - 插入页脚
- `{% include modals.html %}` - 插入模态框

### `_includes/`目录
可重用的HTML片段:
- **header.html**: 导航栏(含Logo,40×40px)
- **footer.html**: 页脚(含Logo,64×64px)
- **modals.html**: 套餐详情弹窗

## 修改指南

### 更新Logo
只需替换 `assets/images/logo.png`,所有页面的页眉和页脚会自动更新。

### 添加新页面
1. 创建新的HTML文件(如 `about.html`)
2. 添加Front Matter:
   ```html
   ---
   layout: default
   title: About Us
   ---
   
   <section>
     <!-- 您的内容 -->
   </section>
   ```
3. 在`_includes/header.html`添加导航链接

### 修改Header/Footer
- 编辑 `_includes/header.html` 或 `_includes/footer.html`
- 推送到GitHub,所有页面自动更新

## 故障排除

### 网站没有更新?
1. 检查GitHub Actions标签页,查看构建状态
2. 确保推送到了正确的分支(`main`)
3. 清除浏览器缓存

### 样式或图片丢失?
- 确保所有资源路径使用 `{{ '/assets/...' | relative_url }}`
- 检查文件名大小写(Linux区分大小写)

### Front Matter错误
- 确保 `---` 在文件的第一行
- YAML语法严格,注意缩进和冒号后的空格

## 与直接HTML的对比

| 方面 | Jekyll模板 | 直接HTML |
|------|-----------|----------|
| 代码复用 | ✅ Header/Footer只写一次 | ❌ 每页重复 |
| 维护性 | ✅ 修改一处,全站更新 | ❌ 需修改所有页面 |
| 本地预览 | 需要Jekyll | ✅ 直接用浏览器打开 |
| GitHub部署 | ✅ 自动构建 | ✅ 直接展示 |
| 学习曲线 | 需了解Liquid语法 | 无需额外知识 |

## 下一步

1. ✅ 项目已转换为Jekyll格式
2. ✅ Logo已添加到header和footer
3. ✅ 所有页面使用模板化结构
4. 🔲 推送到GitHub Pages
5. 🔲 验证网站线上运行

## 参考资料

- [Jekyll官方文档](https://jekyllrb.com/docs/)
- [GitHub Pages文档](https://docs.github.com/en/pages)
- [Liquid模板语言](https://shopify.github.io/liquid/)

---

**注意**: 当前您的本地`index.html`、`packages.html`、`stories.html`都已是Jekyll格式。如果您想直接在浏览器中打开预览(不通过Jekyll),需要使用之前生成的独立HTML版本(备份文件)。推荐的方式是直接推送到GitHub Pages让它自动构建。
