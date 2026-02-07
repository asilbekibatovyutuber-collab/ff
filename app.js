async function loadProducts() {
  try {
    const res = await fetch("http://localhost:5000/api/products");
    products = await res.json();
    generateProducts(products);
  } catch (e) {
    console.error("Mahsulotlarni olishda xato", e);
  }
}

/**************** TELEGRAM FULLSCREEN ****************/
if (window.Telegram && window.Telegram.WebApp) {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.setBackgroundColor("#0f172a");
}

/**************** TELEGRAM SOZLAMALARI ****************/
const TG_TOKEN = "8137282183:AAEldZgm7SGWp4fGDDejZBJZ_hFidtmueVo";
const TG_CHAT_ID = "7050310480";

/**************** GLOBAL O‘ZGARUVCHILAR ****************/
let favorites = [];
let cart = [];
let orders = [];
let currentUser = JSON.parse(localStorage.getItem('m_user')) || null;
let selectedCategory = "all";

/**************** TIL LUG‘ATI ****************/
const translations = {
  uz: {
    logo: "Maktab Market",
    welcome: "Xush kelibsiz!",
    register_form: "Davom etish uchun ismingiz va raqamingizni kiriting",
    enter: "Kirish",
    toCart: "Savatga qo'shish",
    cartTitle: "Savat",
    total: "Jami",
    order: "Buyurtma berish",
    favorites: "Sevimlilar",
    orders: "Buyurtmalar",
    no_orders: "Buyurtmalar yo'q",
    katalog: "Katalog",
    search_placeholder: "Qidirish...",
    feedback_placeholder: "Xabaringizni bu yerga yozing...",
    send: "Yuborish",
    login_label: "Kirish",
    all: "Hammasi",
    clothes: "Kiyimlar",
    electronics: "Elektronika"
  },
  ru: {
    logo: "Школьный Маркет",
    welcome: "Добро пожаловать!",
    register_form: "Введите имя и номер, чтобы продолжить",
    enter: "Войти",
    toCart: "Добавить в корзину",
    cartTitle: "Корзина",
    total: "Итого",
    order: "Оформить заказ",
    favorites: "Избранное",
    orders: "Заказы",
    no_orders: "Нет заказов",
    katalog: "Каталог",
    search_placeholder: "Поиск...",
    feedback_placeholder: "Напишите сообщение...",
    send: "Отправить",
    login_label: "Войти",
    all: "Все",
    clothes: "Одежда",
    electronics: "Электроника"
  }
};

/**************** MAHSULOTLAR ****************/
let products = [];

/**************** MAHSULOTLARNI CHIZISH ****************/
function generateProducts(list = products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  list.forEach((p, index) => {
    const id = 101 + products.indexOf(p);
    grid.insertAdjacentHTML('beforeend', `
      <div class="bg-gray-800/50 p-2 rounded-2xl">
        <img src="${p.img}" class="w-full h-32 object-cover rounded-xl">
        <p class="mt-2 text-sm truncate">${p.name}</p>
        <p class="text-yellow-400 font-bold text-sm">${p.price.toLocaleString()} so'm</p>
        <button onclick="addToCart(${id})" class="w-full bg-white text-black py-2 mt-2 rounded-lg text-xs font-bold">Savatga</button>
        <button onclick="showDetails(${id})" class="w-full bg-gray-700 py-2 mt-1 rounded-lg text-xs">Batafsil</button>
      </div>
    `);
  });
}

/**************** QIDIRUV + FILTR ****************/
function filterAndSearch() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = products.filter(p =>
    (selectedCategory === "all" || p.category.toLowerCase() === selectedCategory) &&
    (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
  );
  generateProducts(filtered);
}

function filterCategory(cat) {
  selectedCategory = cat.toLowerCase();
  filterAndSearch();
}

/**************** BATAFSIL MODAL ****************/
function showDetails(id) {
  const p = products[id - 101];
  if (!p) return;

  document.getElementById("detailImg").src = p.img;
  document.getElementById("detailName").innerText = p.name;
  document.getElementById("detailPrice").innerText = p.price.toLocaleString() + " so'm";
  document.getElementById("detailDesc").innerText = p.description;

  document.getElementById("detailAddToCart").onclick = () => {
    addToCart(id);
    closeModal("detailModal","detailContent");
  };

  openModal("detailModal","detailContent");
}

/**************** SAVAT ****************/
function addToCart(id) {
  const p = products[id - 101];
  cart.push({ name:p.name, price:p.price, img:p.img });
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartList');
  const totalEl = document.getElementById('totalPrice');
  list.innerHTML = '';
  let total = 0;

  cart.forEach(i => {
    total += i.price;
    list.insertAdjacentHTML('beforeend', `
      <div class="flex items-center justify-between bg-gray-800 p-2 rounded-lg mb-2">
        <img src="${i.img}" class="w-10 h-10 rounded">
        <p class="text-xs w-32 truncate">${i.name}</p>
        <p class="text-yellow-400 text-xs">${i.price.toLocaleString()}</p>
      </div>
    `);
  });

  totalEl.innerText = total.toLocaleString();
}

/**************** BUYURTMA + TELEGRAM ****************/
function handleCartAction() {
  if (!cart.length) return alert("Savat bo‘sh!");
  if (!currentUser) return alert("Avval login qiling!");

  const media = cart.map(i => ({
    type:"photo",
    media:i.img,
    caption:`<b>${i.name}</b>\n${i.price.toLocaleString()} so'm`,
    parse_mode:"HTML"
  }));

  const total = cart.reduce((s,i)=>s+i.price,0);

  fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMediaGroup`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ chat_id:TG_CHAT_ID, media })
  }).then(()=>{
    sendToTelegram(`<b>🛒 YANGI BUYURTMA</b>\n\n👤 ${currentUser.name}\n📞 ${currentUser.phone}\n\n<b>Jami: ${total.toLocaleString()} so'm</b>`);
    orders.push({ items:[...cart], total, date:new Date().toLocaleString() });
    cart = [];
    renderCart();
    renderOrders();
  });
}

function sendToTelegram(text){
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ chat_id:TG_CHAT_ID, text, parse_mode:"HTML" })
  });
}

/**************** BUYURTMALAR ****************/
function renderOrders() {
  const list = document.getElementById('ordersList');
  list.innerHTML = '';
  if (!orders.length) {
    document.getElementById('noOrdersMsg').classList.remove('hidden');
    return;
  }
  document.getElementById('noOrdersMsg').classList.add('hidden');

  orders.forEach(o=>{
    let html = `<div class="bg-gray-800 p-3 rounded-xl mb-3">
      <p class="text-xs text-gray-400">${o.date}</p>`;
    o.items.forEach(i=>{
      html += `<div class="flex items-center gap-2 mt-2">
        <img src="${i.img}" class="w-10 h-10 rounded">
        <p class="text-xs">${i.name}</p>
      </div>`;
    });
    html += `<p class="text-right text-yellow-400 font-bold mt-2">${o.total.toLocaleString()} so'm</p></div>`;
    list.insertAdjacentHTML('beforeend', html);
  });
}
function addToCart(id){
  const p = products.find(x => x._id === id);
  cart.push(p);
  renderCart();
}
function showDetails(id){
  const p = products.find(x => x._id === id);
  detailImg.src = p.img;
  detailName.innerText = p.name;
  detailPrice.innerText = p.price.toLocaleString()+" so'm";
  detailDesc.innerText = p.description || "";
  detailAddToCart.onclick = () => addToCart(id);
  openModal("detailModal","detailContent");
}

/**************** MODAL ****************/
function openModal(m,c){
  document.getElementById(m).classList.remove('hidden');
  setTimeout(()=>document.getElementById(c).classList.add('modal-show'),50);
}
function closeModal(m,c){
  document.getElementById(c).classList.remove('modal-show');
  setTimeout(()=>document.getElementById(m).classList.add('hidden'),300);
}

/**************** LOGIN ****************/
function saveUser(){
  const n = userName.value;
  const p = userPhone.value;
  if(!n||!p) return;
  currentUser={name:n,phone:p};
  localStorage.setItem("m_user",JSON.stringify(currentUser));
  navUserLabel.innerText=n;
  loginModal.classList.add("hidden");
}

function checkLogin(){
  if(currentUser) navUserLabel.innerText=currentUser.name;
  else loginModal.classList.remove("hidden");
}

window.onload = () => {
  loadProducts();
  checkLogin();
};
