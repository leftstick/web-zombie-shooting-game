import WebSocket from 'ws';
import fs from 'fs';
async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const ws = new WebSocket((await res.json()).webSocketDebuggerUrl);
  let id = 0, pending = new Map();
  ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (m, p, s) => new Promise(r => { const i = ++id; pending.set(i, r); const o = { id: i, method: m, params: p || {} }; if (s) o.sessionId = s; ws.send(JSON.stringify(o)); });
  await new Promise(r => ws.on('open', r));
  const targets = (await send('Target.getTargets')).result.targetInfos || [];
  const page = targets.find(t => t.type === 'page');
  const a = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const sid = a.result.sessionId;
  await send('Runtime.enable', {}, sid);
  await send('Page.enable', {}, sid);
  // 用桌面尺寸 (1280x720) — 直接跳过横屏提示
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false, touch: false }, sid);
  await send('Page.navigate', { url: 'http://localhost:5174/?v=4' }, sid);
  await new Promise(r => setTimeout(r, 5000));

  // 找 canvas
  const ci = JSON.parse((await send('Runtime.evaluate', {
    expression: 'var c=document.querySelector("canvas");if(!c)return null;var r=c.getBoundingClientRect();return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height,sx:r.width/1280,sy:r.height/720})'
  }, sid)).result.result.value || 'null');
  if (!ci) { console.log('no canvas'); ws.close(); return; }
  console.log('Canvas:', JSON.stringify(ci));

  // 点开始
  const cx = ci.x + 640 * ci.sx, cy = ci.y + 400 * ci.sy;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left' }, sid);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left' }, sid);
  await new Promise(r => setTimeout(r, 1500));

  // 点确认
  const cx2 = ci.x + 640 * ci.sx, cy2 = ci.y + 620 * ci.sy;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx2, y: cy2, button: 'left' }, sid);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx2, y: cy2, button: 'left' }, sid);
  await new Promise(r => setTimeout(r, 2500));

  // 查 Phaser 状态
  const r = await send('Runtime.evaluate', {
    expression: `
      (function(){
        var v=Object.values(window);
        for(var i=0;i<v.length;i++){
          try{
            var g=v[i];
            if(g&&g.scene&&g.scene.scenes){
              var active=g.scene.scenes.filter(function(s){return s.scene.isActive()}).map(function(s){return s.scene.key});
              var gs=g.scene.scenes.find(function(s){return s.scene.key==='GameScene'&&s.scene.isActive()});
              if(gs){
                var obs=[].slice.call(gs.obstacles.getChildren(),0,5).map(function(o){
                  return {x:Math.round(o.x),y:Math.round(o.y),dw:Math.round(o.displayWidth),dh:Math.round(o.displayHeight),bw:Math.round(o.body.width),bh:Math.round(o.body.height)};
                });
                return JSON.stringify({active:active,playerX:Math.round(gs.player.x),playerY:Math.round(gs.player.y),playerBodyY:Math.round(gs.player.body.y),obstacles:obs});
              }
              return JSON.stringify({active:active});
            }
          }catch(e){}
        }
        return JSON.stringify({active:'notfound'});
      })()
    `
  }, sid);
  console.log('State:', r.result?.result?.value);

  const ss = await send('Page.captureScreenshot', { format: 'png' }, sid);
  fs.writeFileSync('/tmp/game_final.png', Buffer.from(ss.result.data, 'base64'));
  console.log('Screenshot saved');
  ws.close();
}
main();
