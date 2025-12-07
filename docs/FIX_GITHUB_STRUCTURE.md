# 修复GitHub仓库嵌套目录问题

## 问题原因

您的文件结构变成了:
```
github.com/sjiangtao2024/chinamedicaltour/
└── chinamedicaltour/        ← 多余的嵌套目录
    ├── _config.yml
    ├── _includes/
    ├── _layouts/
    ├── assets/
    ├── index.html
    └── ...
```

应该是:
```
github.com/sjiangtao2024/chinamedicaltour/
├── _config.yml
├── _includes/
├── _layouts/
├── assets/
├── index.html
└── ...
```

## 解决方案

### 方法一:重新推送正确的文件 (推荐)

```powershell
# 1. 在当前目录 (c:\dev_code\chinamedicaltour)
cd c:\dev_code\chinamedicaltour

# 2. 删除当前的git仓库链接
Remove-Item -Recurse -Force .git

# 3. 重新初始化git
git init
git add .
git commit -m "Initial commit with Jekyll template"

# 4. 连接到远程仓库(使用-f强制推送,覆盖远程内容)
git remote add origin https://github.com/sjiangtao2024/chinamedicaltour.git
git branch -M main
git push -f origin main
```

### 方法二:移动文件到正确位置

如果您想保留Git历史记录:

```powershell
# 1. 克隆仓库到临时目录
cd c:\dev_code
git clone https://github.com/sjiangtao2024/chinamedicaltour.git temp_repo
cd temp_repo

# 2. 移动文件到根目录
Move-Item chinamedicaltour\* . -Force
Remove-Item chinamedicaltour -Recurse -Force

# 3. 提交并推送
git add .
git commit -m "Fix: Move files to repository root"
git push origin main

# 4. 删除临时目录
cd c:\dev_code
Remove-Item temp_repo -Recurse -Force
```

## 执行步骤 (推荐方法一)

让我为您创建一个自动化脚本...
