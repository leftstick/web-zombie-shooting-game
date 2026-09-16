import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const logs = [];
const errors = [];
page.on('console', msg => { logs.push(`[${msg.type()}] ${msg.text()}`); });
page.on('pageerror', err => { errors.push(String(err)); });
page.on('requestfailed', req => { errors.push(`REQ_FAIL: ${req.url()} ${req.failure()?.errorText}`); });

console.log('Navigating...');
await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(1500);
console.log('Loaded');

// 截图主菜单
await page.screenshot({ path: '/tmp/menu.png' });

const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
console.log('Canvas box:', box);
const sx = box.width / 1280; // scale factor
const sy = box.height / 720;

// 点击 "开始游戏" — 按钮大约在 y=400
console.log('Clicking start button...');
await page.mouse.click(box.x + 640 * sx, box.y + 400 * sy);
await page.waitForTimeout(500);

// 如果没切换场景，试其他 y 坐标
for (let y = 360; y <= 440; y += 20) {
  const btnText = await page.locator('canvas').count();
  await page.mouse.click(box.x + 640 * sx, box.y + y * sy);
  await page.waitForTimeout(400);
}

await page.screenshot({ path: '/tmp/after-start.png' });
console.log('After start screenshot saved');

// 看当前场景 — 搜索 canvas 里有没有 CharacterSelect 的元素 (通过检测 Phaser 内部)
const sceneInfo = await page.evaluate(() => {
  // Phaser 游戏实例通常可以通过 window 找到
  const allKeys = Object.keys(window);
  const phaserGame = allKeys.find(k => {
    try { return window[k] && typeof window[k] === 'object' && window[k].scene && window[k].scene.scenes; } catch(e) {}
  });
  if (phaserGame) {
    const game = window[phaserGame];
    const names = game.scene.scenes.map(s => s.scene.key);
    const active = game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    return { key: phaserGame, names, active };
  }
  return null;
});
console.log('Phaser scene info:', sceneInfo);

// 如果我们在 CharacterSelectScene, 点击确认按钮
if (sceneInfo && sceneInfo.active?.includes('CharacterSelectScene')) {
  console.log('In CharacterSelectScene! Clicking confirm button...');
  // 确认出战按钮位置 y=620
  await page.mouse.click(box.x + 640 * sx, box.y + 620 * sy);
  await page.waitForTimeout(1000);
  
  const sceneInfo2 = await page.evaluate(() => {
    const allKeys = Object.keys(window);
    const phaserGame = allKeys.find(k => {
      try { return window[k] && typeof window[k] === 'object' && window[k].scene && window[k].scene.scenes; } catch(e) {}
    });
    if (phaserGame) {
      const game = window[phaserGame];
      return game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    }
    return null;
  });
  console.log('After confirm, active scenes:', sceneInfo2);
  await page.screenshot({ path: '/tmp/after-confirm.png' });
}

console.log('\n=== ALL CONSOLE LOGS ===');
logs.forEach(l => console.log(l));
console.log('\n=== ALL ERRORS ===');
errors.forEach(e => console.log(e));

await browser.close();
