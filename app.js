// Application State
let categories = [];
let items = [];
let activeCategory = 'all';
let searchQuery = '';
let activeTab = 'catalog'; // 'catalog' or 'buy'
let cartSectionExpanded = false;
let selectedDetailItemId = null;
let detailLocalQty = 1;
let qtyPromptItemId = null;
let qtyPromptValue = 1;
let customConfirmCallback = null;

// Firebase Configuration (Paste your config here to enable cloud sync!)
const firebaseConfig = {
  apiKey: "AIzaSyAlCD6o0beolTSLdnrXSviVTRbYQhd84_w",
  authDomain: "shopping-list-fofi.firebaseapp.com",
  databaseURL: "https://shopping-list-fofi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "shopping-list-fofi",
  storageBucket: "shopping-list-fofi.firebasestorage.app",
  messagingSenderId: "482804060067",
  appId: "1:482804060067:web:7f6f40293476c765021416"
};

let isFirebaseEnabled = false;
let db = null;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLA_AQUI_A_TUA_API_KEY") {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    isFirebaseEnabled = true;
    console.log("Firebase sync active.");
  } catch (err) {
    console.warn("Failed to initialize Firebase:", err);
  }
}

// Fallback placeholders for images if empty
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';

// Default mock categories with soft colors to replicate Dribbble categories
const defaultCategories = [
  { id: '1', name: 'Meats', emoji: '🥩', color: '#FFE2E2' },
  { id: '2', name: 'Vegetables', emoji: '🥦', color: '#E2FBE2' },
  { id: '3', name: 'Fruits', emoji: '🍎', color: '#FFF5D1' },
  { id: '4', name: 'Bakery', emoji: '🍞', color: '#FFE8D6' },
  { id: '5', name: 'Drinks', emoji: '🥤', color: '#E0F2FE' },
  { id: '6', name: 'Others', emoji: '🛒', color: '#F1F5F9' }
];

const defaultItems = [
  {
    id: 'item-1',
    name: 'Beetroot Red',
    category: 'Vegetables',
    quantity: 1,
    unit: '500 gm',
    imageUrl: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?w=400&q=80',
    checked: false,
    inList: true
  },
  {
    id: 'item-2',
    name: 'Italian Avocado',
    category: 'Fruits',
    quantity: 1,
    unit: '450 gm',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&q=80',
    checked: false,
    inList: true
  },
  {
    id: 'item-3',
    name: 'Deshi Gajor (Carrot)',
    category: 'Vegetables',
    quantity: 2,
    unit: '300 gm',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80',
    checked: false,
    inList: false
  },
  {
    id: 'item-4',
    name: 'Fresh Bread',
    category: 'Bakery',
    quantity: 1,
    unit: '500 gm',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    checked: true,
    inList: true
  }
];

// Load and start
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  renderApp();
});

function loadData() {
  if (isFirebaseEnabled) {
    db.ref('grocery_list').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        categories = data.categories || [];
        items = data.items || [];
      } else {
        categories = [...defaultCategories];
        items = [...defaultItems];
        saveCategoriesToStorage();
        saveItemsToStorage();
      }
      renderApp();
    });
  } else {
    const localCategories = localStorage.getItem('fc_categories_db');
    const localItems = localStorage.getItem('fc_items_db');

    if (localCategories) {
      categories = JSON.parse(localCategories);
    } else {
      categories = [...defaultCategories];
      saveCategoriesToStorage();
    }

    if (localItems) {
      items = JSON.parse(localItems);
    } else {
      items = [...defaultItems];
      saveItemsToStorage();
    }
  }
}

function saveCategoriesToStorage() {
  localStorage.setItem('fc_categories_db', JSON.stringify(categories));
  if (isFirebaseEnabled) {
    db.ref('grocery_list/categories').set(categories);
  }
}

function saveItemsToStorage() {
  localStorage.setItem('fc_items_db', JSON.stringify(items));
  if (isFirebaseEnabled) {
    db.ref('grocery_list/items').set(items);
  }
}

// Event Setup
function setupEventListeners() {
  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderItems();
  });

  // Tab selections
  document.getElementById('tab-catalog').addEventListener('click', () => {
    switchTab('catalog');
  });
  document.getElementById('tab-buy').addEventListener('click', () => {
    switchTab('buy');
  });

  // Confirm Modal Action
  document.getElementById('confirm-yes-btn').addEventListener('click', () => {
    if (customConfirmCallback) {
      customConfirmCallback();
    }
    closeModal('modal-confirm');
  });

  // Modals triggers
  document.getElementById('btn-add-item').addEventListener('click', () => {
    openItemFormModal();
  });
  
  // Settings Trigger on profile card click
  document.getElementById('btn-settings-trigger').addEventListener('click', () => {
    openModal('modal-settings');
  });

  // Settings Modal Options
  document.getElementById('btn-modal-export').addEventListener('click', () => {
    closeModal('modal-settings');
    exportDatabase();
  });
  
  document.getElementById('btn-modal-import').addEventListener('click', () => {
    closeModal('modal-settings');
    document.getElementById('file-import').click();
  });

  document.getElementById('btn-modal-categories').addEventListener('click', () => {
    closeModal('modal-settings');
    openCategoriesModal();
  });

  document.getElementById('btn-modal-clear-cart').addEventListener('click', () => {
    closeModal('modal-settings');
    showCustomConfirm('Limpar Carrinho', 'Deseja limpar todos os itens do carrinho? Os alimentos continuam guardados no catálogo.', () => {
      items.forEach(item => {
        item.inList = false;
        item.checked = false;
        item.listNote = '';
      });
      saveItemsToStorage();
      renderApp();
    });
  });

  // Clear checked/shopping list (Quick footer bar access)
  const btnClearChecked = document.getElementById('btn-clear-checked');
  if (btnClearChecked) {
    btnClearChecked.addEventListener('click', () => {
      showCustomConfirm('Limpar Carrinho', 'Deseja limpar todos os itens do carrinho? Os alimentos continuam guardados no catálogo.', () => {
        items.forEach(item => {
          item.inList = false;
          item.checked = false;
          item.listNote = '';
        });
        saveItemsToStorage();
        renderApp();
      });
    });
  }

  // Bottom main action button click behavior
  document.getElementById('btn-main-action').addEventListener('click', () => {
    if (activeTab === 'catalog') {
      switchTab('buy');
    } else {
      const inCart = items.filter(i => i.inList && i.checked);
      if (inCart.length > 0) {
        showCustomConfirm('Concluir Compras', `Concluir compras? Os ${inCart.length} itens no carrinho serão arquivados.`, () => {
          items.forEach(item => {
            if (item.inList && item.checked) {
              item.inList = false;
              item.checked = false;
              item.listNote = '';
            }
          });
          saveItemsToStorage();
          switchTab('catalog');
        });
      } else {
        alert('Ainda não tem itens no carrinho para concluir as compras. Clique nas caixas circulares dos itens que já recolheu.');
      }
    }
  });

  // Detail Modal Actions
  document.getElementById('details-qty-minus').addEventListener('click', () => {
    adjustDetailQty(-1);
  });
  document.getElementById('details-qty-plus').addEventListener('click', () => {
    adjustDetailQty(1);
  });
  document.getElementById('details-add-btn').addEventListener('click', () => {
    toggleDetailItemInList();
  });
  // Import file listener
  document.getElementById('file-import').addEventListener('change', importDatabase);
}

function switchTab(tab) {
  activeTab = tab;
  
  // Style tab buttons
  document.getElementById('tab-catalog').classList.toggle('active', tab === 'catalog');
  document.getElementById('tab-buy').classList.toggle('active', tab === 'buy');
  
  // Update header color scheme and text
  const header = document.getElementById('app-header');
  const mainTitle = document.getElementById('header-main-title');
  const avatar = document.getElementById('avatar-icon');
  const profileTitle = document.getElementById('store-profile-title');
  const profileDesc = document.getElementById('store-profile-desc');
  const storeLogo = document.getElementById('store-logo-text');

  mainTitle.innerText = 'Lista de Compras';

  if (tab === 'catalog') {
    header.className = 'app-header theme-catalog';
    avatar.innerText = 'CT';
    profileTitle.innerText = 'Ingredientes & Catálogo';
    profileDesc.innerText = 'Clique para opções da base de dados';
    storeLogo.innerText = '🗂️';
  } else {
    header.className = 'app-header theme-cart';
    avatar.innerText = 'CR';
    profileDesc.innerText = 'Clique para opções da base de dados';
    profileTitle.innerText = 'A Comprar (Lista Ativa)';
    storeLogo.innerText = '📋';
  }

  renderCategories();
  renderItems();
  updateProgress();
}

function renderApp() {
  renderCategories();
  renderItems();
  updateProgress();
}

function renderCategories() {
  const container = document.getElementById('categories-list');
  const select = document.getElementById('item-category-select');
  
  let html = `
    <div class="category-circle-wrapper ${activeCategory === 'all' ? 'active' : ''}" onclick="selectCategory('all')">
      <div class="category-circle" style="background: #F3F4F6;">✨</div>
      <span class="category-label">Todos</span>
    </div>
  `;

  categories.forEach(cat => {
    html += `
      <div class="category-circle-wrapper ${activeCategory === cat.name ? 'active' : ''}" onclick="selectCategory('${cat.name}')">
        <div class="category-circle" style="background: ${cat.color || '#F1F5F9'}">${cat.emoji}</div>
        <span class="category-label">${cat.name}</span>
      </div>
    `;
  });

  container.innerHTML = html;

  // Category select dropdown for form
  let selectHtml = '<option value="" disabled selected>Escolha uma categoria...</option>';
  categories.forEach(cat => {
    selectHtml += `<option value="${cat.name}">${cat.name}</option>`;
  });
  select.innerHTML = selectHtml;
}

function selectCategory(catName) {
  activeCategory = catName;
  renderCategories();
  renderItems();
}

function toggleCartSection() {
  cartSectionExpanded = !cartSectionExpanded;
  renderItems();
}
window.toggleCartSection = toggleCartSection;

function renderItems() {
  const container = document.getElementById('items-container');
  
  if (activeTab === 'catalog') {
    // Filter catalog items
    const filtered = items.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Nenhum ingrediente encontrado no catálogo.</p>
        </div>
      `;
      return;
    }

    // Group by category
    const groups = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });

    const sortedCats = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    
    let html = '';
    sortedCats.forEach(catName => {
      const catItems = groups[catName].sort((a, b) => a.name.localeCompare(b.name));
      html += `
        <div class="category-group">
          <h3 class="category-group-title">${catName}</h3>
          <div class="items-grid">
      `;
      catItems.forEach(item => {
        const imgUrl = item.imageUrl || FALLBACK_IMAGE;
        const inListClass = item.inList ? 'in-list' : '';
        const svgIcon = item.inList 
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        
        html += `
          <div class="catalog-card ${inListClass}" onclick="openDetailsModal('${item.id}')">
            <div class="catalog-img-container">
              <img class="catalog-img" src="${imgUrl}" alt="${item.name}" onerror="this.src='${FALLBACK_IMAGE}'">
            </div>
            <h4 class="catalog-title">${item.name}</h4>
            <div class="catalog-actions" style="justify-content: flex-end; width: 100%; margin-top: auto;">
              <button class="catalog-add-btn" onclick="quickToggleList('${item.id}', event)">
                ${svgIcon}
              </button>
            </div>
          </div>
        `;
      });
      html += `
          </div>
        </div>
      `;
    });
    container.innerHTML = html;

  } else {
    // A Comprar tab
    // 1. Unchecked items
    const unchecked = items.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch && item.inList === true && item.checked === false;
    });

    // 2. Checked items
    const checked = items.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch && item.inList === true && item.checked === true;
    });

    const activeItemsCount = items.filter(i => i.inList).length;

    if (activeItemsCount === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>A sua lista de compras está vazia. Adicione alimentos no "Catálogo".</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Render Unchecked items grouped by category
    if (unchecked.length > 0) {
      const groups = {};
      unchecked.forEach(item => {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
      });

      const sortedCats = Object.keys(groups).sort((a, b) => a.localeCompare(b));
      sortedCats.forEach(catName => {
        const catItems = groups[catName].sort((a, b) => a.name.localeCompare(b.name));
        html += `
          <div class="category-group">
            <h3 class="category-group-title">${catName}</h3>
            <div class="cart-list">
        `;
        catItems.forEach(item => {
          const imgUrl = item.imageUrl || FALLBACK_IMAGE;
          html += `
            <div class="cart-row">
              <div class="cart-checkbox-wrapper">
                <div class="custom-checkbox" onclick="toggleCartCheck('${item.id}', event)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
              <img class="cart-row-img" src="${imgUrl}" alt="${item.name}" onerror="this.src='${FALLBACK_IMAGE}'">
              <div class="cart-row-details" onclick="openDetailsModal('${item.id}')">
                <h4 class="cart-row-title">${item.name}</h4>
                <p class="cart-row-subtitle">${item.category} • ${item.unit}</p>
                ${item.description ? `<span class="cart-row-note" style="margin-bottom: 6px;">📝 ${item.description}</span>` : ''}
                <div class="cart-row-note-container" onclick="event.stopPropagation()">
                  <input type="text" class="cart-row-note-input" placeholder="+ Adicionar nota para esta compra..." value="${item.listNote || ''}" onchange="updateListNote('${item.id}', this.value)">
                </div>
              </div>
              <div class="quantity-pill">
                <button class="qty-circle" onclick="adjustItemQty('${item.id}', -1, event)">-</button>
                <span style="font-weight: 800; font-size: 0.9rem;">${item.quantity}</span>
                <button class="qty-circle" onclick="adjustItemQty('${item.id}', 1, event)">+</button>
              </div>
              <button class="edit-row-btn" onclick="openItemFormModal('${item.id}')" style="display: flex; align-items: center; justify-content: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
            </div>
          `;
        });
        html += `
            </div>
          </div>
        `;
      });
    } else if (checked.length > 0 && unchecked.length === 0) {
      html += `
        <div style="text-align: center; padding: 20px; color: var(--color-text-muted); font-size: 0.9rem;">
          Todos os itens já estão no carrinho! 🎉
        </div>
      `;
    }

    // Render collapsible checked items
    if (checked.length > 0) {
      html += `
        <div class="collapsible-cart">
          <div class="collapsible-cart-header" onclick="toggleCartSection()">
            <h3>🛒 Já no Carrinho (${checked.length})</h3>
            <svg class="chevron-icon ${cartSectionExpanded ? 'expanded' : ''}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="collapsible-cart-content ${cartSectionExpanded ? 'expanded' : ''}">
      `;
      // List checked items simply
      checked.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
      checked.forEach(item => {
        const imgUrl = item.imageUrl || FALLBACK_IMAGE;
        html += `
          <div class="cart-row checked">
            <div class="cart-checkbox-wrapper">
              <div class="custom-checkbox" onclick="toggleCartCheck('${item.id}', event)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
            <img class="cart-row-img" src="${imgUrl}" alt="${item.name}" onerror="this.src='${FALLBACK_IMAGE}'">
            <div class="cart-row-details" onclick="openDetailsModal('${item.id}')">
              <h4 class="cart-row-title">${item.name}</h4>
              <p class="cart-row-subtitle">${item.category} • ${item.unit}</p>
              ${item.description ? `<span class="cart-row-note" style="margin-bottom: 6px;">📝 ${item.description}</span>` : ''}
              <div class="cart-row-note-container" onclick="event.stopPropagation()">
                <input type="text" class="cart-row-note-input" placeholder="+ Adicionar nota para esta compra..." value="${item.listNote || ''}" onchange="updateListNote('${item.id}', this.value)">
              </div>
            </div>
            <div class="quantity-pill">
              <button class="qty-circle" onclick="adjustItemQty('${item.id}', -1, event)">-</button>
              <span style="font-weight: 800; font-size: 0.9rem;">${item.quantity}</span>
              <button class="qty-circle" onclick="adjustItemQty('${item.id}', 1, event)">+</button>
            </div>
            <button class="edit-row-btn" onclick="openItemFormModal('${item.id}')" style="display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
          </div>
        `;
      });
      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }
  updateProgress();
}

function updateProgress() {
  const activeItems = items.filter(i => i.inList === true);
  const total = activeItems.length;
  const checked = activeItems.filter(i => i.checked).length;
  const percentage = total > 0 ? (checked / total) * 100 : 0;

  // Update Progress header
  const progressText = document.getElementById('progress-text');
  const progressBar = document.getElementById('progress-bar');
  if (progressText && progressBar) {
    progressText.innerText = `${checked} / ${total} itens comp.`;
    progressBar.style.width = `${percentage}%`;
  }

  // Update Main action checkout button style
  const mainBtn = document.getElementById('btn-main-action');
  if (activeTab === 'catalog') {
    mainBtn.innerText = `Ver Itens A Comprar (${total} itens)`;
    mainBtn.style.backgroundColor = 'var(--color-accent-green)';
  } else {
    mainBtn.innerText = `Concluir Compras (${checked} no carrinho)`;
    mainBtn.style.backgroundColor = percentage === 100 && total > 0 ? '#10B981' : 'var(--color-accent-green)';
  }
}

function quickToggleList(id, event) {
  if (event) event.stopPropagation();
  const item = items.find(i => i.id === id);
  if (!item) return;

  if (item.inList) {
    // Toggle out of shopping list
    item.inList = false;
    saveItemsToStorage();
    renderItems();
    updateProgress();
  } else {
    // Open custom quantity picker modal
    qtyPromptItemId = id;
    qtyPromptValue = 1;
    document.getElementById('qty-prompt-item-name').innerText = `${item.name} (${item.unit})`;
    document.getElementById('qty-prompt-val').innerText = qtyPromptValue;
    openModal('modal-qty-prompt');
  }
}

// Check/Uncheck inside Cart list row
function toggleCartCheck(id, event) {
  if (event) event.stopPropagation();
  const item = items.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    saveItemsToStorage();
    renderItems();
    updateProgress();
  }
}

// Adjust quantity counter inside rows
function adjustItemQty(id, amount, event) {
  if (event) event.stopPropagation();
  const item = items.find(i => i.id === id);
  if (item) {
    item.quantity = Math.max(1, item.quantity + amount);
    saveItemsToStorage();
    renderItems();
    updateProgress();
  }
}

// Product Details Screen 2 Modal logic
function openDetailsModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  selectedDetailItemId = id;
  detailLocalQty = item.quantity;

  document.getElementById('details-img').src = item.imageUrl || FALLBACK_IMAGE;
  document.getElementById('details-title').innerText = item.name;
  document.getElementById('details-subtitle').innerText = `${item.category} • ${item.unit}`;
  document.getElementById('details-qty-val').innerText = detailLocalQty;
  document.getElementById('details-description').innerText = item.description || 'Sem notas ou descrição especial.';

  const addBtn = document.getElementById('details-add-btn');
  if (item.inList) {
    addBtn.innerText = 'Remover da Lista';
    addBtn.style.backgroundColor = 'var(--color-danger)';
    addBtn.style.color = 'white';
    addBtn.style.boxShadow = 'none';
  } else {
    addBtn.innerText = 'Adicionar à Lista';
    addBtn.style.backgroundColor = 'var(--color-accent-green)';
    addBtn.style.color = 'var(--color-green-header)';
    addBtn.style.boxShadow = '0 4px 15px rgba(159, 232, 112, 0.3)';
  }

  openModal('modal-details');
}

function adjustDetailQty(amount) {
  detailLocalQty = Math.max(1, detailLocalQty + amount);
  document.getElementById('details-qty-val').innerText = detailLocalQty;
}

function toggleDetailItemInList() {
  const item = items.find(i => i.id === selectedDetailItemId);
  if (!item) return;

  item.inList = !item.inList;
  item.quantity = detailLocalQty;
  if (item.inList) {
    item.checked = false;
  }

  saveItemsToStorage();
  closeModal('modal-details');
  renderApp();
}

// Modal Form: Add / Edit item database definitions
function openItemFormModal(id = null) {
  const form = document.getElementById('form-item');
  form.reset();

  const idInput = document.getElementById('item-id');
  const deleteBtn = document.getElementById('btn-delete-item');
  const title = document.getElementById('modal-item-title');
  const preview = document.getElementById('image-preview');

  if (id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    idInput.value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-category-select').value = item.category;
    document.getElementById('item-quantity').value = item.quantity;
    document.getElementById('item-unit-select').value = item.unit;
    document.getElementById('item-description').value = item.description || '';
    document.getElementById('item-image-url').value = item.imageUrl || '';
    
    preview.src = item.imageUrl || FALLBACK_IMAGE;
    title.innerText = 'Editar Alimento no Catálogo';
    deleteBtn.style.display = 'block';
  } else {
    idInput.value = '';
    title.innerText = 'Novo Alimento no Catálogo';
    deleteBtn.style.display = 'none';
    preview.src = FALLBACK_IMAGE;
  }

  openModal('modal-item');
}

// Image preview helper
function previewItemImage(url) {
  document.getElementById('image-preview').src = url || FALLBACK_IMAGE;
}

function saveItem(e) {
  e.preventDefault();

  const id = document.getElementById('item-id').value;
  const name = document.getElementById('item-name').value.trim();
  const category = document.getElementById('item-category-select').value;
  const quantity = parseFloat(document.getElementById('item-quantity').value);
  const unit = document.getElementById('item-unit-select').value;
  const description = document.getElementById('item-description').value.trim();
  const imageUrl = document.getElementById('item-image-url').value.trim();

  if (id) {
    const item = items.find(i => i.id === id);
    if (item) {
      item.name = name;
      item.category = category;
      item.quantity = quantity;
      item.unit = unit;
      item.description = description;
      item.imageUrl = imageUrl;
    }
  } else {
    const newItem = {
      id: 'item-' + Date.now(),
      name,
      category,
      quantity,
      unit,
      description,
      imageUrl,
      checked: false,
      inList: true
    };
    items.push(newItem);
  }

  saveItemsToStorage();
  closeModal('modal-item');
  renderApp();
}

function deleteCurrentItem() {
  const id = document.getElementById('item-id').value;
  if (id) {
    showCustomConfirm('Excluir Alimento', 'Excluir este ingrediente definitivamente do catálogo?', () => {
      items = items.filter(i => i.id !== id);
      saveItemsToStorage();
      closeModal('modal-item');
      renderApp();
    });
  }
}

// Categories Management modal logic
function openCategoriesModal() {
  renderManageCategoriesList();
  openModal('modal-categories');
}

function renderManageCategoriesList() {
  const container = document.getElementById('manage-categories-list');
  let html = '';
  
  categories.forEach(cat => {
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--color-border);">
        <span>${cat.emoji} ${cat.name}</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn-secondary" style="padding: 6px 10px; display: flex; align-items: center; justify-content: center;" onclick="editCategory('${cat.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="btn-danger" style="padding: 6px 10px; display: flex; align-items: center; justify-content: center;" onclick="deleteCategory('${cat.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html || '<p style="color: var(--color-text-muted);">Nenhuma categoria criada.</p>';
}

function editCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('category-id').value = cat.id;
  document.getElementById('category-name').value = cat.name;
  document.getElementById('category-emoji').value = cat.emoji;

  document.getElementById('label-category-form').innerText = 'Editar Categoria';
  document.getElementById('btn-submit-category').innerText = 'Gravar Alterações';
  document.getElementById('btn-cancel-cat-edit').style.display = 'block';
}

function cancelCategoryEdit() {
  document.getElementById('category-id').value = '';
  document.getElementById('category-name').value = '';
  document.getElementById('category-emoji').value = '';

  document.getElementById('label-category-form').innerText = 'Nova Categoria';
  document.getElementById('btn-submit-category').innerText = 'Criar Categoria';
  document.getElementById('btn-cancel-cat-edit').style.display = 'none';
}

function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById('category-id').value;
  const nameInput = document.getElementById('category-name');
  const emojiInput = document.getElementById('category-emoji');
  
  const name = nameInput.value.trim();
  const emoji = emojiInput.value.trim();

  if (id) {
    // Edit existing category
    const cat = categories.find(c => c.id === id);
    if (cat) {
      const oldName = cat.name;
      cat.name = name;
      cat.emoji = emoji;

      // Update items belonging to this category
      items.forEach(item => {
        if (item.category === oldName) {
          item.category = name;
        }
      });
      saveItemsToStorage();
    }
  } else {
    // Create new category
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }

    const colors = ['#FFE2E2', '#E2FBE2', '#FFF5D1', '#FFE8D6', '#E0F2FE', '#F3E8FF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCat = {
      id: 'cat-' + Date.now(),
      name,
      emoji,
      color: randomColor
    };
    categories.push(newCat);
  }

  saveCategoriesToStorage();
  cancelCategoryEdit();
  renderApp();
  renderManageCategoriesList();
}

function deleteCategory(id) {
  const categoryToDelete = categories.find(c => c.id === id);
  if (!categoryToDelete) return;
  
  showCustomConfirm('Remover Categoria', `Remover categoria "${categoryToDelete.name}"? Itens relacionados serão marcados como "Others".`, () => {
    categories = categories.filter(c => c.id !== id);
    saveCategoriesToStorage();
    
    items.forEach(item => {
      if (item.category === categoryToDelete.name) {
        item.category = 'Others';
      }
    });
    
    saveItemsToStorage();
    renderApp();
    renderManageCategoriesList();
  });
}

// Open / Close generic
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Database Export / Import
function exportDatabase() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ categories, items }, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "lista_compras_db.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDatabase(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.categories && data.items) {
        categories = data.categories;
        items = data.items;
        
        localStorage.setItem('fc_categories_db', JSON.stringify(categories));
        localStorage.setItem('fc_items_db', JSON.stringify(items));
        
        if (isFirebaseEnabled) {
          db.ref('grocery_list').set({ categories, items });
        } else {
          renderApp();
        }
        switchTab('catalog');
        alert('Dados importados com sucesso!');
      } else {
        alert('JSON inválido. Certifique-se que tem "categories" e "items".');
      }
    } catch (err) {
      alert('Erro ao carregar ficheiro JSON.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// Global scope exposure for inline HTML handlers
window.closeModal = closeModal;
window.openModal = openModal;
window.deleteCategory = deleteCategory;
window.openDetailsModal = openDetailsModal;
window.openItemFormModal = openItemFormModal;
window.adjustItemQty = adjustItemQty;
window.toggleCartCheck = toggleCartCheck;
window.quickToggleList = quickToggleList;
window.selectCategory = selectCategory;
window.deleteCurrentItem = deleteCurrentItem;
window.saveItem = saveItem;
window.saveCategory = saveCategory;
window.previewItemImage = previewItemImage;
window.editCategory = editCategory;
window.cancelCategoryEdit = cancelCategoryEdit;
window.editCurrentDetailItem = () => {
  closeModal('modal-details');
  openItemFormModal(selectedDetailItemId);
};
window.openCategoriesModal = openCategoriesModal;

function adjustQtyPrompt(amount) {
  qtyPromptValue = Math.max(1, qtyPromptValue + amount);
  document.getElementById('qty-prompt-val').innerText = qtyPromptValue;
}

function confirmQtyPrompt() {
  const item = items.find(i => i.id === qtyPromptItemId);
  if (item) {
    item.quantity = qtyPromptValue;
    item.inList = true;
    item.checked = false;
    saveItemsToStorage();
    closeModal('modal-qty-prompt');
    renderApp();
  }
}

window.adjustQtyPrompt = adjustQtyPrompt;
window.confirmQtyPrompt = confirmQtyPrompt;

function showCustomConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').innerText = title;
  document.getElementById('confirm-message').innerText = message;
  customConfirmCallback = onConfirm;
  openModal('modal-confirm');
}
window.showCustomConfirm = showCustomConfirm;

function updateListNote(id, value) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.listNote = value;
    saveItemsToStorage();
  }
}
window.updateListNote = updateListNote;



