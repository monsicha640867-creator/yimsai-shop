/* ===========================================================
   ตั้งค่าร้าน — แก้ไฟล์นี้ไฟล์เดียวพอ
   =========================================================== */
window.SHOP = {
  // 1) วาง URL Web App จาก Google Apps Script ตรงนี้ (ลงท้ายด้วย /exec)
  SCRIPT_URL: 'PASTE_YOUR_APPS_SCRIPT_URL_HERE',

  // 2) โฟลเดอร์รูป — ปกติใช้ 'images/' (โฟลเดอร์ใน GitHub repo นี้)
  //    ถ้าเก็บรูปไว้ repo อื่น ใส่ URL เช่น
  //    'https://raw.githubusercontent.com/<user>/<repo>/main/images/'
  IMG_BASE: 'images/',

  SHIPPING_FEE: 40,      // ค่าส่ง (บาท)
  FREE_SHIP_MIN: 300,    // ซื้อครบเท่านี้ ส่งฟรี

  // 3) ข้อมูลผู้ส่ง (พิมพ์บนใบปะหน้า)
  SENDER: {
    name: 'ร้านยิ้มใส (YIMSAI)',
    phone: '08x-xxx-xxxx',
    address: '123 ถ.ตัวอย่าง แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900'
  },

  // 4) สินค้า — sku ต้องตรงกับใน apps-script/Code.gs
  //    bin = ตำแหน่งชั้นวางในคลัง (ใช้ตอนหยิบสินค้า)
  PRODUCTS: [
    {
      sku: 'YS-MINT-160', name: 'ยิ้มใส เฟรชมินต์', size: '160 กรัม', price: 89,
      img: 'products/mint.svg', bin: 'A-01', color: '#16a394',
      tag: 'ขายดี',
      features: ['ลมหายใจหอมสดชื่น 12 ชม.', 'ฟลูออไรด์ 1,450 ppm', 'ลดคราบพลัค']
    },
    {
      sku: 'YS-CHAR-160', name: 'ยิ้มใส ชาร์โคล ไวท์', size: '160 กรัม', price: 109,
      img: 'products/charcoal.svg', bin: 'A-02', color: '#2b2f3a',
      tag: 'ฟันขาว',
      features: ['ถ่านไม้ไผ่ขจัดคราบชา-กาแฟ', 'ฟันขาวขึ้นใน 14 วัน*', 'ไม่ทำลายเคลือบฟัน']
    },
    {
      sku: 'YS-KIDS-80', name: 'ยิ้มใส คิดส์ สตรอว์เบอร์รี', size: '80 กรัม', price: 69,
      img: 'products/kids.svg', bin: 'B-01', color: '#ef5b7a',
      tag: 'สำหรับเด็ก',
      features: ['สำหรับเด็ก 3 ปีขึ้นไป', 'รสสตรอว์เบอร์รี ไม่เผ็ด', 'ปลอดภัยหากกลืนเล็กน้อย']
    }
  ]
};
