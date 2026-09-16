import WebSocket from 'ws';
import fs from 'fs';

async function getWsUrl() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  return (await res.json()).webSocketDebuggerUrl;
}

async function test() {
  const ws = new WebSocket(await getWsUrl());
  let id = 0;
  const pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params, sid) => new Promise(resolve => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    const payload = { id: msgId, method: method, params: params || {} };
    if (sid) payload.sessionId = sid;
    ws.send(JSON.stringify(payload));
  });
  
  await new Promise(r => ws.on('open', r));
  const targets = (await send('Target.getTargets')).result.targetInfos || [];
  const pageTarget = targets.find(t => t.type === 'page');
  const attach = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  const sid = attach.result.sessionId;
  await send('Runtime.enable', {}, sid);
  await send('Page.enable', {}, sid);
  
  // 模拟手机
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 3, mobile: true, touch: true,
    screenOrientation: { angle: 90, type: 'landscapePrimary' }
  }, sid);
  await send('Network.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  }, sid);
  
  await send('Page.navigate', { url: 'http://localhost:5174/' }, sid);
  await new Promise(r => setTimeout(r, 5000));
  
  // 注入日志捕获
  await send('Runtime.evaluate', { expression: `
    window.__logs = [];
    const ol=console.log,oe=console.error;
    console.log=(...a)=>{window.__logs.push('[log] '+a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' '));ol.apply(console,a)};
    console.error=(...a)=>{window.__logs.push('[err] '+a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' '));oe.apply(console,a)};
  ` }, sid);
  
  // 获取 canvas
  const ci = (await send('Runtime.evaluate', { expression: `(function(){var c=document.querySelector('canvas');if(!c)return null;var r=c.getBoundingClientRect();return{r};})()` }, sid)).result?.result?.value;
  if (!ci) { console.log('no canvas'); ws.close(); return; }
  const sx = ci.r.width / 1280, sy = ci.r.height / 720;
  const ox = ci.r.x, oy = ci.r.y;
  console.log(`Canvas: ${ci.r.width}x${ci.r.height}, scale: ${sx.toFixed(3)}, isMobile=true`);
  
  // 点击开始
  const click = async (wx, wy) => {
    const cx = ox + wx * sx, cy = oy + wy * sy;
    await send('Input.dispatchMouseEvent', {type:'mouseMoved',x:cx,y:cy}, sid);
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {type:'mousePressed',x:cx,y:cy,button:'left'}, sid);
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:cx,y:cy,button:'left'}, sid);
  };
  
  await click(640, 400);
  await new Promise(r => setTimeout(r, 1500));
  await click(640, 620);
  await new Promise(r => setTimeout(r, 2500));
  
  // 查 Phaser InputManager 状态
  const r = await send('Runtime.evaluate', { expression: `
    (function(){
      var v=Object.values(window);
      var game=null;
      for(var i=0;i<v.length;i++){try{if(v[i]&&v[i].scene&&v[i].scene.scenes){game=v[i];break;}}catch(e){}}
      if(!game)return'no_game';
      var gs=null;
      for(var i=0;i<game.scene.scenes.length;i++){var s=game.scene.scenes[i];if(s.scene.key==='GameScene'&&s.scene.isActive()){gs=s;break;}}
      if(!gs)return'no_game_scene_active_active='+game.scene.scenes.filter(function(s){return s.scene.isActive()}).map(function(s){return s.scene.key}).join(',');
      var im=gs.inputManager;
      return JSON.stringify({
        isMobile:im.isMobile,
        camX:gs.cameras.main.scrollX,camY:gs.cameras.main.scrollY,
        playerX:gs.player.x,playerY:gs.player.y,
        fireBtn:im.btnFire?{x:im.btnFire.x,y:im.btnFire.y,w:im.btnFire.width,h:im.btnFire.height}:null,
        fireAnchor:{x:im.anchors.fireX,y:im.anchors.fireY},
        firing:im.firing,jump:im.jumpPressed,reload:im.reloadPressed,
        firePointer:active:im.firePointer?.active,pointerId:im.firePointer?.pointerId,
      });
    })();
  ` }, sid);
  const state = JSON.parse(r.result?.result?.value.replace(/active:/g, '"active":').replace(/pointerId:/g, '"pointerId":'));
  console.log('\n=== GameScene 状态 ===');
  console.log(JSON.stringify(state, null, 2));
  
  if (state.fireBtn) {
    // 算 fire 按钮屏幕坐标: screenX = worldX - camX
    const fireSX = state.fireBtn.x - state.camX;
    const fireSY = state.fireBtn.y - state.camY;
    const fcx = ox + fireSX * sx, fcy = oy + fireSY * sy;
    console.log(`\n触摸 fire 按钮: world(${state.fireBtn.x},${state.fireBtn.y}) → screen(${fireSX.toFixed(0)},${fireSY.toFixed(0)}) → canvas(${fcx.toFixed(1)},${fcy.toFixed(1)})`);
    
    await click(fireSX, fireSY); // 直接传 screen coords (相对于 viewport origin)
    await new Promise(r => setTimeout(r, 300));
    
    const after = await send('Runtime.evaluate', { expression: `
      (function(){
        var v=Object.values(window);var game;for(var i=0;i<v.length;i++){try{if(v[i]&&v[i].scene&&v[i].scene.scenes){game=v[i];break;}}catch(e){}}
        var gs=game.scene.scenes.find(function(s){return s.scene.key==='GameScene'&&s.scene.isActive();});
        var im=gs.inputManager;
        return JSON.stringify({firing:im.firing,bulletCount:gs.bullets.countActive(),ammo:gs.player.ammo});
      })();
    ` }, sid);
    console.log('触摸 fire 后:', after.result?.result?.value);
    
    // 再按几次 fire 看有没有用
    for (let i = 0; i < 3; i++) {
      await click(fireSX, fireSY);
      await new Promise(r => setTimeout(r, 150));
    }
    const after2 = await send('Runtime.evaluate', { expression: `
      (function(){
        var v=Object.values(window);var game;for(var i=0;i<v.length;i++){try{if(v[i]&&v[i].scene&&v[i].scene.scenes){game=v[i];break;}}catch(e){}}
        var gs=game.scene.scenes.find(function(s){return s.scene.key==='GameScene'&&s.scene.isActive();});
        return JSON.stringify({bulletCount:gs.bullets.countActive(),ammo:gs.player.ammo,hp:gs.player.hp});
      })();
    ` }, sid);
    console.log('连按 fire 4 次后:', after2.result?.result?.value);
  }
  
  // 全部日志
  const logs = await send('Runtime.evaluate', { expression: `window.__logs.join('\\n')` }, sid);
  console.log('\n=== 全部日志 ===');
  console.log(logs.result?.result?.value || '(empty)');
  
  // 截图
  const ss = await send('Page.captureScreenshot', { format: 'png' }, sid);
  fs.writeFileSync('/tmp/game_running.png', Buffer.from(ss.result.data, 'base64'));
  
  ws.close();
}
test().catch(e => console.error(e));
