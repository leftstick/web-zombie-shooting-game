#!/usr/bin/env bash
# 本地部署脚本: 构建并将 dist/ 推送到 gh-pages 分支
# 用法: ./scripts/deploy.sh
set -euo pipefail

echo "==> 构建项目..."
npm run build

echo "==> 准备 gh-pages 分支..."
# 创建临时目录用于 gh-pages 工作树
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# 克隆当前仓库的 gh-pages 分支 (或初始化空分支)
git clone --branch gh-pages --depth 1 "$(git remote get-url origin)" "$TMP_DIR" 2>/dev/null || {
  echo "==> gh-pages 分支不存在, 创建孤儿分支..."
  git -C "$TMP_DIR" init
  git -C "$TMP_DIR" checkout -b gh-pages
  git -C "$TMP_DIR" remote add origin "$(git remote get-url origin)"
}

# 清空旧内容并复制新构建产物
cd "$TMP_DIR"
git rm -rf . 2>/dev/null || true
cp -r "$OLDPWD/dist/." .

# 确保 .nojekyll 存在 (GitHub Pages 不处理下划线开头的文件)
touch .nojekyll

git add -A
git -c user.name="deploy-bot" -c user.email="deploy@bot.local" commit -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)" 2>/dev/null || echo "==> 无变更可提交"

echo "==> 推送到 gh-pages..."
git push origin gh-pages --force

echo "==> 部署完成!"
