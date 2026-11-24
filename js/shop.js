(function () {
  const S = window.SHOP;
  const cart = {};
  S.PRODUCTS.forEach(p => (cart[p.sku] = 0));
  const $ = id => document.getElementById(id);
  const baht = n => '฿' + Number(n).toLocaleString('th-TH');
  const imgUrl = p => (S.IMG_BASE || 'images/') + p.img;

  function calc() {
    let sub = 0, count = 0;
    S.PRODUCTS.forEach(p => { sub += cart[p.sku] * p.price; count += cart[p.sku]; });
    const ship = count === 0 || sub >= S.FREE_SHIP_MIN ? 0 : S.SHIPPING_FEE;
    return { sub, ship, total: sub + ship, count };
  }

  function stepper(sku) {
    return `<div class="step" data-sku="${sku}">
      <button type="button" data-d="-1" aria-label="ลด">−</button>
      <span>${cart[sku]}</span>
      <button type="button" data-d="1" aria-label="เพิ่ม">+</button></div>`;
  }

  function renderProducts() {
    $('productGrid').innerHTML = S.PRODUCTS.map(p => `
      <article class="card" style="--c:${p.color}">
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
        <img src="${imgUrl(p)}" alt="${p.name}" loading="lazy">
        <h3>${p.name}</h3>
        <p class="size">${p.size} · SKU ${p.sku}</p>
        <ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <div class="buy"><b class="price">${baht(p.price)}</b>${stepper(p.sku)}</div>
      </article>`).join('');
  }

  function render() {
    document.querySelectorAll('.step').forEach(el => { el.querySelector('span').textContent = cart[el.dataset.sku]; });
    const c = calc();
    const lines = S.PRODUCTS.filter(p => cart[p.sku] > 0);
    $('summaryLines').innerHTML = lines.length
      ? lines.map(p => `<div class="line"><img src="${imgUrl(p)}" alt=""><div><b>${p.name}</b><small>${baht(p.price)} × ${cart[p.sku]}</small></div>${stepper(p.sku)}</div>`).join('')
      : '<p class="hint">ยังไม่มีสินค้า — กด + ที่สินค้าด้านบน</p>';
    $('sSub').textContent = baht(c.sub);
    $('sShip').textContent = c.ship ? baht(c.ship) : (c.count ? 'ฟรี' : '฿0');
    $('sTotal').textContent = baht(c.total);
    $('shipHint').textContent = c.count && c.sub < S.FREE_SHIP_MIN ? `ซื้อเพิ่มอีก ${baht(S.FREE_SHIP_MIN - c.sub)} ส่งฟรี!` : '';
    $('cartCount').textContent = c.count;
    $('cartTotal').textContent = baht(c.total);
    $('cartbar').classList.toggle('show', c.count > 0);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.step button');
    if (!b) return;
    const sku = b.parentElement.dataset.sku;
    cart[sku] = Math.max(0, Math.min(50, cart[sku] + Number(b.dataset.d)));
    render();
  });

  $('orderForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, err = $('formErr'), btn = $('submitBtn');
    const d = Object.fromEntries(new FormData(f));
    d.phone = (d.phone || '').replace(/\D/g, '');
    d.postcode = (d.postcode || '').replace(/\D/g, '');
    err.textContent = '';
    if (calc().count === 0) return (err.textContent = 'กรุณาเลือกสินค้าอย่างน้อย 1 ชิ้น');
    if (!d.name.trim() || !d.address.trim() || !d.district.trim() || !d.province.trim()) return (err.textContent = 'กรุณากรอกข้อมูลที่มี * ให้ครบ');
    if (!/^0\d{8,9}$/.test(d.phone)) return (err.textContent = 'เบอร์โทรไม่ถูกต้อง');
    if (!/^\d{5}$/.test(d.postcode)) return (err.textContent = 'รหัสไปรษณีย์ต้องมี 5 หลัก');
    if (!/^https:\/\/script\.google\.com\//.test(S.SCRIPT_URL)) return (err.textContent = 'ร้านยังไม่ได้ตั้งค่า SCRIPT_URL ใน config.js');

    btn.disabled = true; btn.textContent = 'กำลังส่ง...';
    try {
      const res = await fetch(S.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'order', ...d, items: cart })
      }).then(r => r.json());
      if (!res.ok) throw new Error(res.error);
      $('doneId').textContent = res.orderId;
      $('doneTotal').textContent = baht(res.total);
      $('doneModal').hidden = false;
    } catch (x) {
      err.textContent = 'ส่งไม่สำเร็จ: ' + (x.message || 'ลองใหม่อีกครั้ง');
      btn.disabled = false; btn.textContent = 'ยืนยันสั่งซื้อ';
    }
  });

  renderProducts();
  render();
})();
