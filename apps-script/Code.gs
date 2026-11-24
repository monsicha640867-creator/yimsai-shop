/* =====================================================================
   YIMSAI — Google Apps Script (วางในชีต: ส่วนขยาย > Apps Script)
   ทำหน้าที่: รับออเดอร์จากหน้าเว็บ → บันทึกลง Google Sheet
             ส่งรายการออเดอร์ให้หน้า admin (หยิบ/แพ็ค/ใบปะหน้า)
   ===================================================================== */

const SHEET_NAME = 'Orders';
const ADMIN_KEY = 'change-me-1234';   // ⚠️ เปลี่ยนรหัสนี้ก่อน Deploy
const TZ = 'Asia/Bangkok';
const SHIPPING_FEE = 40;
const FREE_SHIP_MIN = 300;

// ราคาฝั่งเซิร์ฟเวอร์ (กันคนแก้ราคาในเบราว์เซอร์) — sku ต้องตรงกับ config.js
const PRODUCTS = {
  'YS-MINT-160': { name: 'ยิ้มใส เฟรชมินต์ 160 ก.', price: 89 },
  'YS-CHAR-160': { name: 'ยิ้มใส ชาร์โคล ไวท์ 160 ก.', price: 109 },
  'YS-KIDS-80':  { name: 'ยิ้มใส คิดส์ สตรอว์เบอร์รี 80 ก.', price: 69 }
};
const STATUSES = ['ใหม่', 'หยิบแล้ว', 'แพ็คแล้ว', 'ส่งแล้ว', 'ยกเลิก'];
const PAYMENTS = ['COD', 'โอนเงิน'];

const BASE_HEADERS = ['OrderID', 'วันที่', 'ชื่อผู้รับ', 'เบอร์โทร', 'ที่อยู่', 'อำเภอ/เขต', 'จังหวัด', 'รหัสไปรษณีย์'];
const TAIL_HEADERS = ['รายการสินค้า', 'ค่าสินค้า', 'ค่าส่ง', 'ยอดรวม', 'ชำระเงิน', 'หมายเหตุ', 'สถานะ', 'เลขพัสดุ'];
function headers_() { return BASE_HEADERS.concat(Object.keys(PRODUCTS), TAIL_HEADERS); }

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    const h = headers_();
    sh.appendRow(h);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, h.length).setFontWeight('bold').setBackground('#d9f4ef');
  }
  return sh;
}

/* ---------- entry points ---------- */
function doGet() { return json_({ ok: true, msg: 'YIMSAI API พร้อมใช้งาน' }); }

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    let out;
    if (body.action === 'order') out = createOrder_(body);
    else if (body.action === 'list') { auth_(body.key); out = listOrders_(); }
    else if (body.action === 'update') { auth_(body.key); out = updateOrders_(body); }
    else throw new Error('ไม่รู้จักคำสั่ง');
    out.ok = true;
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- actions ---------- */
function createOrder_(b) {
  if (b.website) throw new Error('spam');                        // honeypot
  const name = clean_(b.name, 100), phone = String(b.phone || '').replace(/\D/g, '');
  const address = clean_(b.address, 300), district = clean_(b.district, 100);
  const province = clean_(b.province, 100), postcode = String(b.postcode || '').replace(/\D/g, '');
  const payment = PAYMENTS.indexOf(b.payment) >= 0 ? b.payment : 'COD';
  const note = clean_(b.note, 300);

  if (!name || !address || !district || !province) throw new Error('กรอกข้อมูลไม่ครบ');
  if (!/^0\d{8,9}$/.test(phone)) throw new Error('เบอร์โทรไม่ถูกต้อง');
  if (!/^\d{5}$/.test(postcode)) throw new Error('รหัสไปรษณีย์ต้องมี 5 หลัก');

  const items = b.items || {};
  let subtotal = 0, count = 0; const qtyCols = [], lines = [];
  Object.keys(PRODUCTS).forEach(function (sku) {
    const q = Math.max(0, Math.min(50, parseInt(items[sku], 10) || 0));
    qtyCols.push(q);
    if (q > 0) { subtotal += q * PRODUCTS[sku].price; count += q; lines.push(sku + ' x' + q); }
  });
  if (count === 0) throw new Error('ยังไม่ได้เลือกสินค้า');
  const shipping = subtotal >= FREE_SHIP_MIN ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_();
    const now = new Date();
    const id = 'YS' + Utilities.formatDate(now, TZ, 'yyMMdd') + '-' + String(sh.getLastRow()).padStart(4, '0');
    const row = [id, Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm'), txt_(name), txt_(phone), txt_(address),
      txt_(district), txt_(province), txt_(postcode)]
      .concat(qtyCols, [lines.join(', '), subtotal, shipping, total, payment, txt_(note), 'ใหม่', '']);
    sh.appendRow(row);
    return { orderId: id, subtotal: subtotal, shipping: shipping, total: total };
  } finally { lock.releaseLock(); }
}

function listOrders_() {
  const sh = sheet_();
  const data = sh.getDataRange().getDisplayValues();
  const h = data.shift();
  const col = function (n) { return h.indexOf(n); };
  const skus = Object.keys(PRODUCTS);
  const orders = data.filter(function (r) { return r[0]; }).map(function (r) {
    const items = {};
    skus.forEach(function (s) { const q = parseInt(r[col(s)], 10) || 0; if (q) items[s] = q; });
    return {
      id: r[0], date: r[1], name: r[2], phone: r[3], address: r[4], district: r[5], province: r[6], postcode: r[7],
      items: items, subtotal: num_(r[col('ค่าสินค้า')]), shipping: num_(r[col('ค่าส่ง')]), total: num_(r[col('ยอดรวม')]),
      payment: r[col('ชำระเงิน')], note: r[col('หมายเหตุ')], status: r[col('สถานะ')], tracking: r[col('เลขพัสดุ')]
    };
  });
  return { orders: orders };
}

// body: { ids:[...], status:'แพ็คแล้ว', tracking:{ id: 'TH123...' } }
function updateOrders_(b) {
  const ids = b.ids || [];
  if (b.status && STATUSES.indexOf(b.status) < 0) throw new Error('สถานะไม่ถูกต้อง');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sheet_();
    const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const cStatus = h.indexOf('สถานะ') + 1, cTrack = h.indexOf('เลขพัสดุ') + 1;
    const idCol = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(function (r) { return r[0]; });
    let n = 0;
    ids.forEach(function (id) {
      const i = idCol.indexOf(id);
      if (i < 0) return;
      if (b.status) sh.getRange(i + 2, cStatus).setValue(b.status);
      if (b.tracking && b.tracking[id] != null) sh.getRange(i + 2, cTrack).setValue(txt_(clean_(b.tracking[id], 40)));
      n++;
    });
    return { updated: n };
  } finally { lock.releaseLock(); }
}

/* ---------- helpers ---------- */
function auth_(k) { if (k !== ADMIN_KEY) throw new Error('รหัสผู้ดูแลไม่ถูกต้อง'); }
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max); }
function txt_(v) { return v === '' ? '' : "'" + v; }   // เก็บเป็นข้อความ (เลข 0 นำหน้าไม่หาย + กันสูตร)
function num_(v) { return Number(String(v).replace(/[^\d.-]/g, '')) || 0; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// กด Run ฟังก์ชันนี้ 1 ครั้ง เพื่อสร้างหัวตารางและอนุญาตสิทธิ์
function setup() { sheet_(); }
