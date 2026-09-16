import WebSocket from 'ws';
import fs from 'fs';

async function getWsUrl() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  return data.webSocketDebuggerUrl;
}

async function test() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  
  function send(method, params = {}, sessionId) {
    return new Promise((resolve) => {
      const msgId = ++id;
      pending.set(msgId, resolve);
      const payload = { id: msgId, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  }
  
  await new Promise(r => ws.on('open', r));
  
  // 拿第一个 page target
  const targetsRes = await send('Target.getTargets');
  const targetInfos = targetsRes.result.targetInfos || [];
  const pageTarget = targetInfos.find(t => t.type === 'page');
  if (!pageTarget) { console.log('no page target'); ws.close(); return; }
  console.log('Using page:', pageTarget.url);
  
  const attachRes = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  const sid = attachRes.result.sessionId;
  
  // 模拟手机 (landscape)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    touch: true,
    screenOrientation: { angle: 90, type: 'landscapePrimary' }
  }, sid);
  await send('Network.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  }, sid);
  
  await send('Runtime.enable', {}, sid);
  await send('Page.enable', {}, sid);
  
  // 导航
  await send('Page.navigate', { url: 'http://localhost:5174/' }, sid);
  await new Promise(r => setTimeout(r, 5000));
  
  // 注入日志
  await send('Runtime.evaluate', {
    expression: `
      window.__logs = [];
      const ol = console.log, oe = console.error, ow = console.warn;
      console.log = function(...a) { window.__logs.push('[log] ' + a.map(x => typeof x==='object'?JSON.stringify(x):String(x)).join(' ')); ol.apply(console,a); };
      console.error = function(...a) { window.__logs.push('[error] ' + a.map(x => typeof x==='object'?JSON.stringify(x):String(x)).join(' ')); oe.apply(console,a); };
      window.addEventListener('error', function(e) { window.__logs.push('[jserror] ' + e.message); });
      'injected'
    `
  }, sid);
  
  // 获取页面信息
  const infoRes = await send('Runtime.evaluate', {
    expression: `
      (function(){
        var c = document.querySelector('canvas');
        if (!c) return JSON.stringify({noCanvas: true, url: location.href});
        var r = c.getBoundingClientRect();
        var isMobile = navigator.userAgent.includes('Android') || navigator.userAgent.includes('Mobile');
        return JSON.stringify({
          canvasX: r.x, canvasY: r.y, canvasW: r.width, canvasH: r.height,
          canvasScaleX: r.width/1280, canvasScaleY: r.height/720,
          isMobile: isMobile, vw: window.innerWidth, vh: window.innerHeight
        });
      })();
    `
  }, sid);
  const info = JSON.parse(infoRes.result?.result?.value || '{}');
  console.log('设备信息:', JSON.stringify(info));
  
  // 看初始化日志
  const logs0 = await send('Runtime.evaluate', { expression: `window.__logs.slice(-10).join('\\n')` }, sid);
  console.log('初始化日志:', logs0.result?.result?.value);
  
  if (info.canvasX === undefined) { ws.close(); return; }
  
  // 点击开始游戏
  const sx = info.canvasScaleX, sy = info.canvasScaleY;
  const clickStart = async () => {
    const cx = info.canvasX + 640 * sx, cy = info.canvasY + 400 * sy;
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: cx, y: cy}, sid);
    await new Promise(r => setTimeout(r, 100));
    await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: cx, y: cy, button: 'left'}, sid);
    await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: cx, y: cy, button: 'left'}, sid);
  };
  await clickStart();
  await new Promise(r => setTimeout(r, 1500));
  
  // 点击确认出战
  const cx2 = info.canvasX + 640 * sx, cy2 = info.canvasY + 620 * sy;
  await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: cx2, y: cy2}, sid);
  await new Promise(r => setTimeout(r, 100));
  await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: cx2, y: cy2, button: 'left'}, sid);
  await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: cx2, y: cy2, button: 'left'}, sid);
  await new Promise(r => setTimeout(r, 2000));
  
  // 检查 Phaser 对象
  const gsInfo = await send('Runtime.evaluate', {
    expression: `
      (function(){
        var game = Object.values(window).find(function(v){ try { return v && v.scene && v.scene.scenes; } catch(e){ return false; } });
        if (!game) return 'no game';
        var gs = game.scene.scenes.find(function(s){ return s.scene.key === 'GameScene' && s.scene.isActive(); });
        if (!gs) return 'no active GameScene';
        var im = gs.inputManager;
        return JSON.stringify({
          isMobile: im.isMobile,
          camScrollX: gs.cameras.main.scrollX,
          camScrollY: gs.cameras.main.scrollY,
          fireBtn: im.btnFire ? { x: im.btnFire.x, y: im.btnFire.y } : null,
          jumpBtn: im.btnJump ? { x: im.btnJump.x, y: im.btnJump.y } : null,
          reloadBtn: im.btnReload ? { x: im.btnReload.x, y: im.btnReload.y } : null,
          firing: im.firing, jumpPressed: im.jumpPressed, reloadPressed: im.reloadPressed
        });
      })();
    `
  }, sid);
  const gsState = JSON.parse(gsInfo.result?.result?.value || 'null');
  console.log('GameScene 状态:', JSON.stringify(gsState, null, 2));
  
  if (gsState && gsState.fireBtn) {
    // 计算 fire 按钮的屏幕坐标 (world → screen)
    const fireScreenX = gsState.fireBtn.x - gsState.camScrollX;
    const fireScreenY = gsState.fireBtn.y - gsState.camScrollY;
    // 相对 canvas
    const fcx = info.canvasX + fireScreenX * sx;
    const fcy = info.canvasY + fireScreenY * sy;
    console.log('触摸 fire 按钮 at screen:', fireScreenX, fireScreenY, '→ canvas:', fcx, fcy);
    
    // 模拟触摸 fire
    await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: fcx, y: fcy}, sid);
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {type: 'mousePressed', x: fcx, y: fcy, button: 'left'}, sid);
    await new Promise(r => setTimeout(r, 80));
    await send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: fcx, y: fcy, button: 'left'}, sid);
    await new Promise(r => setTimeout(r, 600));
    
    // 看结果
    const afterFire = await send('Runtime.evaluate', {
      expression: `
        (function(){
          var game = Object.values(window).find(function(v){ try { return v && v.scene && v.scene.scenes; } catch(e){ return false; } });
          var gs = game.scene.scenes.find(function(s){ return s.scene.key === 'GameScene' && s.scene.isActive(); });
          return JSON.stringify({
            firing: gs.inputManager.firing,
            jumpPressed: gs.inputManager.jumpPressed,
            reloadPressed: gs.inputManager.reloadPressed,
            bulletCount: gs.bullets.countActive(),
            ammo: gs.player.ammo,
            hp: gs.player.hp,
            cameraX: gs.cameras.main.scrollX
          });
        })();
      `
    }, sid);
    console.log('触摸 fire 后:', afterFire.result?.result?.value);
  }
  
  // 最终日志
  const finalLogs = await send('Runtime.evaluate', { expression: `window.__logs.join('\\n')` }, sid);
  console.log('\n=== 全部日志 ===');
  console.log(finalLogs.result?.result?.value || '(empty)');
  
  // 截图
  const ss = await send('Page.captureScreenshot', { format: 'png' }, sid);
  fs.writeFileSync('/tmp/mobile_game.png', Buffer.from(ss.result.data, 'base64'));
  console.log('\n截图已保存 /tmp/mobile_game.png');
  
  ws.close();
}

test().catch(e => console.error(e));
