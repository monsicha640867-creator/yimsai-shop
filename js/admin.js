(function () {
  const S = window.SHOP;
  const STATUSES = ['ใหม่', 'หยิบแล้ว', 'แพ็คแล้ว', 'ส่งแล้ว', 'ยกเลิก'];
  const STAGE_STATUS = { pick: 'ใหม่', pack: 'หยิบแล้ว', labels: 'แพ็คแล้ว' };
  const P = Object.fromEntries(S.PRODUCTS.map(p => [p.sku, p]));
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const baht = n => '฿' + Number(n || 0).toLocaleString('th-TH');
  const img = sku => P[sku] ? (S.IMG_BASE || 'images/') + P[sku].img : '';
  const pname = sku => P[sku] ? `${P[sku].name} ${P[sku].size}` : sku;
  const pieces = o => Object.values(o.items).reduce((a, b) => a + b, 0);

  let key = sessionStorage.getItem('ys_key') || '';
  let orders = [], selected = new Set(), view = 'orders', pack = {};

  function toast(msg, bad) {
    const t = $('toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(t._t); t._t = setTimeout(() => (t.className = 'toast'), 2600);
  }

  async function api(action, data = {}) {
    const res = await fetch(S.SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, key, ...data })
    }).then(r => r.json());
    if (!res.ok) throw new Error(res.error);
    return res;
  }

  async function load() {
    const res = await api('list');
    orders = res.orders.reverse();             // ใหม่สุดอยู่บน
    selected = new Set([...selected].filter(id => orders.some(o => o.id === id)));
    renderAll();
  }

  async function setStatus(ids, status, tracking) {
    if (!ids.length) return toast('ไม่มีออเดอร์ให้บันทึก', true);
    await api('update', { ids, status, tracking });
    orders.forEach(o => {
      if (ids.includes(o.id)) { o.status = status; if (tracking && tracking[o.id] != null) o.tracking = tracking[o.id]; }
    });
    selected.clear();
    toast(`บันทึก "${status}" แล้ว ${ids.length} ออเดอร์`);
    renderAll();
  }

  // ออเดอร์ที่ใช้ในแต่ละขั้น: ที่ติ๊กเลือกไว้ หรือ ตามสถานะของขั้นนั้น
  function workSet(stage) {
    const pickSel = orders.filter(o => selected.has(o.id) && o.status !== 'ยกเลิก');
    return pickSel.length ? pickSel : orders.filter(o => o.status === STAGE_STATUS[stage]);
  }

  /* ---------------- ออเดอร์ ---------------- */
  function renderOrders() {
    const fs = $('fStatus').value, q = $('fSearch').value.trim().toLowerCase();
    const list = orders.filter(o => (!fs || o.status === fs) &&
      (!q || [o.id, o.name, o.phone].join(' ').toLowerCase().includes(q)));
    $('orderRows').innerHTML = list.map(o => `
      <tr class="${selected.has(o.id) ? 'sel' : ''}">
        <td><input type="checkbox" data-id="${esc(o.id)}" ${selected.has(o.id) ? 'checked' : ''}></td>
        <td><b>${esc(o.id)}</b></td><td>${esc(o.date)}</td>
        <td>${esc(o.name)}<br><small>${esc(o.phone)}</small></td><td>${esc(o.province)}</td>
        <td>${Object.entries(o.items).map(([s, q]) => `${esc(s)} ×${q}`).join('<br>')}</td>
        <td>${baht(o.total)}</td><td>${esc(o.payment)}</td>
        <td><span class="st st${STATUSES.indexOf(o.status)}">${esc(o.status)}</span></td><td>${esc(o.tracking)}</td>
      </tr>`).join('') || '<tr><td colspan="10" class="mut c">ไม่มีออเดอร์</td></tr>';
    $('checkAll').checked = list.length > 0 && list.every(o => selected.has(o.id));
    $('selInfo').textContent = `เลือก ${selected.size} ออเดอร์`;
    const cnt = s => orders.filter(o => o.status === s).length;
    const sales = orders.filter(o => o.status !== 'ยกเลิก').reduce((a, o) => a + o.total, 0);
    $('stats').innerHTML = STATUSES.map((s, i) => `<div class="stat st${i}"><b>${cnt(s)}</b>${s}</div>`).join('') +
      `<div class="stat"><b>${baht(sales)}</b>ยอดขายรวม</div>`;
    renderOrders.list = list;
  }

  /* ---------------- 1. หยิบสินค้า ---------------- */
  function renderPick() {
    const set = workSet('pick');
    const sum = {};
    set.forEach(o => Object.entries(o.items).forEach(([s, q]) => (sum[s] = (sum[s] || 0) + q)));
    const rows = Object.keys(sum).sort((a, b) => (P[a]?.bin || 'Z').localeCompare(P[b]?.bin || 'Z'));
    const total = Object.values(sum).reduce((a, b) => a + b, 0);
    $('pickArea').innerHTML = !set.length ? '<p class="mut">ไม่มีออเดอร์สถานะ "ใหม่" ให้หยิบ</p>' : `
      <div class="phead"><h2>ใบหยิบสินค้า</h2><span>${new Date().toLocaleString('th-TH')} · ${set.length} ออเดอร์ · ${total} ชิ้น</span></div>
      <table class="pick"><thead><tr><th>ชั้นวาง</th><th></th><th>SKU</th><th>สินค้า</th><th>จำนวน</th><th>หยิบแล้ว</th></tr></thead><tbody>
      ${rows.map(s => `<tr><td><b class="bin">${esc(P[s]?.bin || '-')}</b></td><td><img src="${img(s)}" alt=""></td>
        <td>${esc(s)}</td><td>${esc(pname(s))}</td><td class="qty">${sum[s]}</td><td class="box">☐</td></tr>`).join('')}
      </tbody></table>
      <h3>แยกตามออเดอร์ (สำหรับคัดใส่ตะกร้า)</h3>
      <table class="pick small"><thead><tr><th>ตะกร้า</th><th>OrderID</th><th>ผู้รับ</th><th>สินค้า</th><th>ชิ้น</th></tr></thead><tbody>
      ${set.map((o, i) => `<tr><td>${i + 1}</td><td>${esc(o.id)}</td><td>${esc(o.name)}</td>
        <td>${Object.entries(o.items).map(([s, q]) => `${esc(s)} ×${q}`).join(', ')}</td><td>${pieces(o)}</td></tr>`).join('')}
      </tbody></table>`;
  }

  /* ---------------- 2. แพ็คสินค้า ---------------- */
  function packOf(o) { return pack[o.id] || (pack[o.id] = {}); }
  function isPacked(o) { return Object.entries(o.items).every(([s, q]) => (packOf(o)[s] || 0) === q); }

  function renderPack() {
    const set = workSet('pack');
    const active = set.find(o => !isPacked(o));
    $('packArea').innerHTML = !set.length ? '<p class="mut">ไม่มีออเดอร์สถานะ "หยิบแล้ว" ให้แพ็ค</p>' : set.map(o => {
      const done = isPacked(o);
      return `<div class="pcard ${done ? 'done' : ''} ${o === active ? 'active' : ''}">
        <div class="ph"><b>${esc(o.id)}</b><span>${esc(o.name)} · ${esc(o.province)}</span></div>
        ${Object.entries(o.items).map(([s, q]) => {
          const c = packOf(o)[s] || 0;
          return `<div class="pi ${c === q ? 'ok' : ''}" data-o="${esc(o.id)}" data-s="${esc(s)}">
            <img src="${img(s)}" alt=""><div><b>${esc(pname(s))}</b><small>${esc(s)}</small></div>
            <span class="cnt">${c}/${q}</span></div>`;
        }).join('')}
        ${o.note ? `<p class="note">📝 ${esc(o.note)}</p>` : ''}
        <div class="pf"><button class="btn sm ghost" data-reset="${esc(o.id)}">ล้าง</button>
          <button class="btn sm" data-packed="${esc(o.id)}" ${done ? '' : 'disabled'}>✓ ปิดกล่อง</button></div>
      </div>`;
    }).join('');
  }

  function addPack(o, sku) {
    const need = o.items[sku] || 0, have = packOf(o)[sku] || 0;
    if (!need) return toast(`❌ ${o.id} ไม่มี ${sku} — หยิบผิด!`, true);
    if (have >= need) return toast(`❌ ${sku} ครบแล้ว (${need}) — เกินจำนวน!`, true);
    packOf(o)[sku] = have + 1;
    if (isPacked(o)) toast(`✅ ${o.id} ครบแล้ว กด "ปิดกล่อง"`);
    renderPack();
  }

  /* ---------------- 3. ใบปะหน้า ---------------- */
  function renderLabels() {
    const set = workSet('labels');
    const s = S.SENDER;
    $('trackArea').innerHTML = set.length ? `<p class="mut">ใส่เลขพัสดุ (ไม่บังคับ) แล้วกด "บันทึกส่งแล้ว"</p>
      <div class="tracks">${set.map(o => `<label>${esc(o.id)} · ${esc(o.name)}<input data-track="${esc(o.id)}" value="${esc(o.tracking)}" placeholder="เลขพัสดุ"></label>`).join('')}</div>` : '';
    $('labelArea').innerHTML = !set.length ? '<p class="mut no-print">ไม่มีออเดอร์สถานะ "แพ็คแล้ว"</p>' : set.map(o => `
      <div class="label">
        <div class="lf"><small>ผู้ส่ง</small><b>${esc(s.name)}</b> โทร ${esc(s.phone)}<br>${esc(s.address)}</div>
        <div class="lt"><small>ผู้รับ</small>
          <div class="rn">${esc(o.name)}</div><div class="rp">โทร ${esc(o.phone)}</div>
          <div class="ra">${esc(o.address)}<br>${esc(o.district)} ${esc(o.province)}</div>
          <div class="pc">${esc(o.postcode).split('').map(d => `<span>${d}</span>`).join('')}</div>
        </div>
        <div class="pay ${o.payment === 'COD' ? 'cod' : ''}">${o.payment === 'COD' ? `เก็บเงินปลายทาง ${baht(o.total)}` : 'ชำระแล้ว (โอนเงิน)'}</div>
        <svg class="bc" data-code="${esc(o.id)}"></svg>
        <div class="li"><b>${esc(o.id)}</b> · ${esc(o.date)} · ${pieces(o)} ชิ้น<br>
          ${Object.entries(o.items).map(([sk, q]) => `${esc(sk)} ×${q}`).join(' | ')}</div>
      </div>`).join('');
    if (window.JsBarcode) document.querySelectorAll('.bc').forEach(el =>
      JsBarcode(el, el.dataset.code, { format: 'CODE128', height: 44, width: 1.8, fontSize: 14, margin: 0 }));
  }

  /* ---------------- routing ---------------- */
  function renderAll() {
    renderOrders();
    if (view === 'pick') renderPick();
    if (view === 'pack') renderPack();
    if (view === 'labels') renderLabels();
  }
  function go(v) {
    view = v;
    document.querySelectorAll('section[data-view]').forEach(s => (s.hidden = s.dataset.view !== v));
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    document.body.dataset.mode = v;
    renderAll();
    if (v === 'pack') setTimeout(() => $('scanInput').focus(), 50);
  }

  /* ---------------- events ---------------- */
  STATUSES.forEach(s => { $('fStatus').add(new Option(s, s)); $('bulkStatus').add(new Option('→ ' + s, s)); });
  $('fStatus').onchange = $('fSearch').oninput = renderOrders;
  $('tabs').onclick = e => e.target.dataset.v && go(e.target.dataset.v);
  $('reloadBtn').onclick = () => load().then(() => toast('โหลดแล้ว')).catch(x => toast(x.message, true));
  $('logoutBtn').onclick = () => { sessionStorage.removeItem('ys_key'); location.reload(); };

  $('orderRows').onchange = e => {
    const id = e.target.dataset.id; if (!id) return;
    e.target.checked ? selected.add(id) : selected.delete(id); renderOrders();
  };
  $('checkAll').onchange = e => {
    (renderOrders.list || []).forEach(o => (e.target.checked ? selected.add(o.id) : selected.delete(o.id))); renderOrders();
  };
  $('bulkStatus').onchange = e => {
    const st = e.target.value; e.target.value = '';
    if (st && confirm(`เปลี่ยน ${selected.size} ออเดอร์ เป็น "${st}"?`)) setStatus([...selected], st).catch(x => toast(x.message, true));
  };

  $('pickDone').onclick = () => {
    const ids = workSet('pick').map(o => o.id);
    if (ids.length && confirm(`ยืนยันหยิบครบ ${ids.length} ออเดอร์?`)) setStatus(ids, 'หยิบแล้ว').catch(x => toast(x.message, true));
  };

  $('scanInput').onkeydown = e => {
    if (e.key !== 'Enter') return;
    const sku = e.target.value.trim().toUpperCase(); e.target.value = '';
    const active = workSet('pack').find(o => !isPacked(o));
    if (!active) return toast('แพ็คครบทุกออเดอร์แล้ว');
    addPack(active, sku);
  };
  $('packArea').onclick = e => {
    const it = e.target.closest('.pi');
    if (it) { const o = orders.find(x => x.id === it.dataset.o); return addPack(o, it.dataset.s); }
    const r = e.target.dataset.reset; if (r) { pack[r] = {}; return renderPack(); }
    const p = e.target.dataset.packed; if (p) setStatus([p], 'แพ็คแล้ว').catch(x => toast(x.message, true));
  };

  $('shipDone').onclick = () => {
    const set = workSet('labels'), tracking = {};
    document.querySelectorAll('[data-track]').forEach(i => (tracking[i.dataset.track] = i.value.trim()));
    if (set.length && confirm(`บันทึก "ส่งแล้ว" ${set.length} ออเดอร์?`)) setStatus(set.map(o => o.id), 'ส่งแล้ว', tracking).catch(x => toast(x.message, true));
  };

  $('loginForm').onsubmit = async e => {
    e.preventDefault();
    key = $('keyInput').value; await start();
  };

  async function start() {
    try {
      if (!/^https:\/\/script\.google\.com\//.test(S.SCRIPT_URL)) throw new Error('ยังไม่ได้ใส่ SCRIPT_URL ใน config.js');
      await load();
      sessionStorage.setItem('ys_key', key);
      $('login').hidden = true; $('app').hidden = false; go('orders');
    } catch (x) { $('loginErr').textContent = x.message; sessionStorage.removeItem('ys_key'); }
  }
  if (key) start();
})();
