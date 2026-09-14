// ==========================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================================================
// আপনার ফায়ারবেস কনসোল (Firebase Console) থেকে ক্রেডেনশিয়াল বসিয়ে দিন
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dbRef = database.ref('fbt_data'); // Cloud reference

// ==========================================================================
// 2. DEFAULT DATA STRUCTURE
// ==========================================================================
const DEFAULT_DATA = {
    users: [
        { phone: "01711111111", name: "রহিম আহমেদ", role: "head", familyId: "fam_1" },
        { phone: "01722222222", name: "নাসরিন সুলতানা", role: "member", familyId: "fam_1" },
        { phone: "01933333333", name: "তানভীর হোসেন", role: "solo", familyId: null }
    ],
    families: [
        { id: "fam_1", name: "আহমেদ পরিবার", headPhone: "01711111111", budget: 45000 }
    ],
    incomes: [
        { id: "inc_1", userPhone: "01711111111", title: "মাসিক বেতন", amount: 40000, type: "family", date: "2026-09-01" },
        { id: "inc_2", userPhone: "01722222222", title: "টিউশনি আয়", amount: 8000, type: "family", date: "2026-09-05" }
    ],
    expenses: [
        { id: "exp_1", userPhone: "01711111111", title: "বাসা ভাড়া", category: "বাসা ভাড়া", amount: 18000, type: "family", date: "2026-09-02" },
        { id: "exp_2", userPhone: "01722222222", title: "বিদ্যুৎ বিল", category: "ইউটিলিটি বিল", amount: 2500, type: "family", date: "2026-09-06" }
    ],
    bazarLists: [
        {
            id: "baz_1",
            creatorPhone: "01711111111",
            assigneePhone: "01711111111",
            title: "সাপ্তাহিক কাঁচা বাজার",
            type: "family",
            status: "pending", // 'draft', 'pending', 'completed'
            items: [
                { name: "জিরা", qty: "২০০ গ্রাম", actualPrice: 0, isBought: false },
                { name: "রশুন", qty: "১০০ গ্রাম", actualPrice: 0, isBought: false },
                { name: "চাল (নাজিরশাইল)", qty: "১০ কেজি", actualPrice: 0, isBought: false }
            ],
            totalSpent: 0
        }
    ],
    notifications: []
};

// ==========================================================================
// 3. GLOBAL STATE & REALTIME SYNC
// ==========================================================================
let db = DEFAULT_DATA;
let currentUser = null;
let currentView = 'family';
let chartOverviewInstance = null;
let chartCategoryInstance = null;

function saveDB(newData) {
    dbRef.set(newData);
}

// REALTIME DATABASE LISTENER
dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        db = data;
    } else {
        saveDB(DEFAULT_DATA);
        db = DEFAULT_DATA;
    }

    if (currentUser) {
        const freshUser = (db.users || []).find(u => u.phone === currentUser.phone);
        if (freshUser) currentUser = freshUser;
        renderDashboard();
    }
});

window.onload = () => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const filterElem = document.getElementById('filter-month');
    if (filterElem) filterElem.value = currentMonth;

    const todayStr = today.toISOString().slice(0, 10);
    if (document.getElementById('inc-date')) document.getElementById('inc-date').value = todayStr;
    if (document.getElementById('exp-date')) document.getElementById('exp-date').value = todayStr;
};

// ==========================================================================
// 4. AUTHENTICATION HANDLERS
// ==========================================================================
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        loginBtn.className = "w-1/2 py-2 text-center font-semibold text-emerald-600 border-b-2 border-emerald-600";
        regBtn.className = "w-1/2 py-2 text-center font-semibold text-slate-400 border-b-2 border-transparent";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        regBtn.className = "w-1/2 py-2 text-center font-semibold text-emerald-600 border-b-2 border-emerald-600";
        loginBtn.className = "w-1/2 py-2 text-center font-semibold text-slate-400 border-b-2 border-transparent";
    }
}

function toggleFamilyNameInput() {
    const type = document.getElementById('reg-type').value;
    const container = document.getElementById('family-name-container');
    if (container) container.style.display = type === 'head' ? 'block' : 'none';
}

function handleLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const user = (db.users || []).find(u => u.phone === phone);

    if (user) {
        currentUser = user;
        initDashboard();
    } else {
        alert('মোবাইল নম্বরটি সঠিক নয় অথবা রেজিস্টার করা নেই।');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const type = document.getElementById('reg-type').value;
    const familyName = document.getElementById('reg-family-name').value.trim();

    if ((db.users || []).find(u => u.phone === phone)) {
        alert('এই নম্বর দিয়ে পূর্বে অ্যাকাউন্ট খোলা হয়েছে!');
        return;
    }

    let familyId = null;
    if (type === 'head') {
        familyId = 'fam_' + Date.now();
        if (!db.families) db.families = [];
        db.families.push({
            id: familyId,
            name: familyName || (name + " এর পরিবার"),
            headPhone: phone,
            budget: 0
        });
    }

    const newUser = { phone, name, role: type, familyId };
    if (!db.users) db.users = [];
    db.users.push(newUser);
    saveDB(db);

    currentUser = newUser;
    initDashboard();
}

function logout() {
    currentUser = null;
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('main-header').classList.add('hidden');
}

// ==========================================================================
// 5. DASHBOARD NAVIGATION
// ==========================================================================
function initDashboard() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.getElementById('main-header').classList.remove('hidden');

    document.getElementById('nav-user-name').innerText = currentUser.name;
    document.getElementById('user-role-badge').innerText = currentUser.role === 'head' ? 'পরিবার প্রধান' : (currentUser.role === 'member' ? 'পরিবার সদস্য' : 'পারসোনাল ইউজার');

    if (currentUser.role === 'solo') {
        currentView = 'personal';
        document.getElementById('tab-btn-family').classList.add('hidden');
    } else {
        currentView = 'family';
        document.getElementById('tab-btn-family').classList.remove('hidden');
    }

    renderDashboard();
}

function switchDashboardView(view) {
    currentView = view;
    document.getElementById('tab-btn-family').className = view === 'family' ? "px-4 py-2 rounded-lg font-semibold text-sm bg-emerald-600 text-white" : "px-4 py-2 rounded-lg font-semibold text-sm text-slate-600 hover:bg-slate-200";
    document.getElementById('tab-btn-personal').className = view === 'personal' ? "px-4 py-2 rounded-lg font-semibold text-sm bg-emerald-600 text-white" : "px-4 py-2 rounded-lg font-semibold text-sm text-slate-600 hover:bg-slate-200";
    renderDashboard();
}

// ==========================================================================
// 6. MAIN RENDER FUNCTION & CALCULATIONS
// ==========================================================================
function renderDashboard() {
    const monthElem = document.getElementById('filter-month');
    const selectedMonth = monthElem ? monthElem.value : '';
    const isFamilyView = (currentView === 'family');

    const membersPanel = document.getElementById('section-family-members-panel');
    if (membersPanel) membersPanel.style.display = isFamilyView ? 'block' : 'none';

    const viewIndicator = document.getElementById('view-indicator-tag');
    if (viewIndicator) viewIndicator.innerText = isFamilyView ? 'পারিবারিক' : 'পারসোনাল (গোপন)';

    const headControls = document.getElementById('head-controls');
    if (headControls) headControls.style.display = (isFamilyView && currentUser.role === 'head') ? 'block' : 'none';

    let totalIncome = 0;
    let totalBudget = 0;
    let totalExpense = 0;

    let familyMembers = isFamilyView && currentUser.familyId ? (db.users || []).filter(u => u.familyId === currentUser.familyId) : [currentUser];
    let memberPhones = familyMembers.map(m => m.phone);
    let filterType = isFamilyView ? 'family' : 'personal';

    if (isFamilyView && currentUser.familyId) {
        const family = (db.families || []).find(f => f.id === currentUser.familyId);
        totalBudget = family ? family.budget : 0;
    }

    const filteredIncomes = (db.incomes || []).filter(i => {
        const isUserMatch = isFamilyView ? memberPhones.includes(i.userPhone) : i.userPhone === currentUser.phone;
        const isMonthMatch = selectedMonth ? (i.date && i.date.startsWith(selectedMonth)) : true;
        return i.type === filterType && isUserMatch && isMonthMatch;
    });

    const filteredExpenses = (db.expenses || []).filter(e => {
        const isUserMatch = isFamilyView ? memberPhones.includes(e.userPhone) : e.userPhone === currentUser.phone;
        const isMonthMatch = selectedMonth ? (e.date && e.date.startsWith(selectedMonth)) : true;
        return e.type === filterType && isUserMatch && isMonthMatch;
    });

    totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
    if (!isFamilyView) totalBudget = totalIncome;
    totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const remainingBalance = totalBudget - totalExpense;

    document.getElementById('card-total-income').innerText = `৳${totalIncome.toLocaleString('bn-BD')}`;
    document.getElementById('card-total-budget').innerText = `৳${totalBudget.toLocaleString('bn-BD')}`;
    document.getElementById('card-total-expense').innerText = `৳${totalExpense.toLocaleString('bn-BD')}`;
    document.getElementById('card-remaining-balance').innerText = `৳${remainingBalance.toLocaleString('bn-BD')}`;

    const alertBar = document.getElementById('over-budget-alert');
    if (alertBar) {
        if (isFamilyView && totalExpense > totalBudget && totalBudget > 0) {
            alertBar.classList.remove('hidden');
        } else {
            alertBar.classList.add('hidden');
        }
    }

    renderCharts(totalBudget, totalExpense, filteredExpenses);
    if (isFamilyView) renderFamilyMembers();
    renderBazarLists();
    renderDateWiseTables(filteredIncomes, filteredExpenses);
    generateMonthlyReportModalContent(selectedMonth, totalIncome, totalBudget, totalExpense, filteredExpenses);
    updateNotificationBadge();
}

// ==========================================================================
// 7. TABLES & CHARTS RENDER
// ==========================================================================
function renderDateWiseTables(incomes, expenses) {
    const incBody = document.getElementById('income-table-body');
    const expBody = document.getElementById('expense-table-body');
    if (!incBody || !expBody) return;

    incBody.innerHTML = '';
    expBody.innerHTML = '';

    document.getElementById('income-count-tag').innerText = `${incomes.length} টি`;
    document.getElementById('expense-count-tag').innerText = `${expenses.length} টি`;

    incomes.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(i => {
        const user = (db.users || []).find(u => u.phone === i.userPhone);
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-semibold text-xs text-slate-500">${i.date || 'N/A'}</td>
            <td class="p-2 font-medium text-slate-800">${i.title}</td>
            <td class="p-2 text-xs text-slate-500">${user ? user.name : i.userPhone}</td>
            <td class="p-2 font-bold text-emerald-600">৳${i.amount}</td>
        `;
        incBody.appendChild(tr);
    });

    expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-2 font-semibold text-xs text-slate-500">${e.date || 'N/A'}</td>
            <td class="p-2 font-medium text-slate-800">${e.title}</td>
            <td class="p-2 text-xs text-slate-500"><span class="bg-slate-100 px-2 py-0.5 rounded">${e.category}</span></td>
            <td class="p-2 font-bold text-rose-600">৳${e.amount}</td>
        `;
        expBody.appendChild(tr);
    });
}

function renderCharts(budget, expense, filteredExpenses) {
    const canvas1 = document.getElementById('chart-budget-overview');
    const canvas2 = document.getElementById('chart-category-breakdown');
    if (!canvas1 || !canvas2) return;

    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    if (chartOverviewInstance) chartOverviewInstance.destroy();
    if (chartCategoryInstance) chartCategoryInstance.destroy();

    chartOverviewInstance = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['পরিকল্পিত বাজেট', 'মোট খরচ', 'অবশিষ্ট'],
            datasets: [{
                data: [budget, expense, Math.max(0, budget - expense)],
                backgroundColor: ['#2563eb', '#e11d48', '#10b981'],
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const categoryMap = {};
    filteredExpenses.forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const catLabels = Object.keys(categoryMap);
    const catData = Object.values(categoryMap);

    chartCategoryInstance = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: catLabels.length ? catLabels : ['কোনো খরচ নেই'],
            datasets: [{
                data: catData.length ? catData : [1],
                backgroundColor: ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#64748b']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ==========================================================================
// 8. BAZAR / SHOPPING MANAGEMENT (WITH DRAFT & FRACTIONAL WEIGHTS)
// ==========================================================================
function populateBazarAssignees() {
    const select = document.getElementById('bazar-assignee');
    if (!select) return;

    select.innerHTML = `<option value="${currentUser.phone}">👤 আমি নিজে বাজার করব</option>`;

    if (currentUser.familyId) {
        const members = (db.users || []).filter(u => u.familyId === currentUser.familyId && u.phone !== currentUser.phone);
        members.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.phone;
            opt.innerText = `👉 ${m.name}-কে দায়িত্ব দিন (${m.phone})`;
            select.appendChild(opt);
        });
    }
}

function addBazarItemRow() {
    const container = document.getElementById('bazar-items-inputs');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "flex gap-2";
    div.innerHTML = `
        <input type="text" placeholder="পণ্যের নাম (যেমন: জিরা)" required class="item-name flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-emerald-500">
        <input type="text" placeholder="পরিমাণ (২০০ গ্রাম)" required class="item-qty w-36 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-emerald-500">
    `;
    container.appendChild(div);
}

function handleCreateBazar(e, isDraft = false) {
    if (e) e.preventDefault();

    const nameInputs = document.querySelectorAll('.item-name');
    const qtyInputs = document.querySelectorAll('.item-qty');
    const items = [];

    nameInputs.forEach((input, index) => {
        if (input.value.trim()) {
            items.push({
                name: input.value.trim(),
                qty: qtyInputs[index].value.trim() || '১ টি',
                actualPrice: 0,
                isBought: false
            });
        }
    });

    if (items.length === 0) {
        alert('কমপক্ষে একটি পণ্যের নাম লিখুন!');
        return;
    }

    const assignee = document.getElementById('bazar-assignee').value;
    const status = isDraft ? 'draft' : 'pending';

    if (!db.bazarLists) db.bazarLists = [];
    db.bazarLists.push({
        id: 'baz_' + Date.now(),
        creatorPhone: currentUser.phone,
        assigneePhone: assignee,
        title: document.getElementById('bazar-title').value.trim() || 'বাজার ফর্দ',
        type: document.getElementById('bazar-type').value,
        status: status, // 'draft' / 'pending'
        items,
        totalSpent: 0
    });

    saveDB(db);
    closeModal('modal-add-bazar');

    const form = document.getElementById('form-add-bazar');
    if (form) form.reset();
}

function publishBazarDraft(bazarId) {
    const bazar = (db.bazarLists || []).find(b => b.id === bazarId);
    if (!bazar) return;

    bazar.status = 'pending';
    saveDB(db);
}

function deleteBazarList(bazarId) {
    if (confirm('আপনি কি নিশ্চিত যে এই বাজার তালিকাটি মুছে ফেলতে চান?')) {
        db.bazarLists = (db.bazarLists || []).filter(b => b.id !== bazarId);
        saveDB(db);
    }
}

function renderBazarLists() {
    const container = document.getElementById('bazar-lists-container');
    if (!container) return;
    container.innerHTML = '';

    const isFamilyView = (currentView === 'family');
    let lists = [];

    if (isFamilyView && currentUser.familyId) {
        const familyMemberPhones = (db.users || []).filter(u => u.familyId === currentUser.familyId).map(m => m.phone);
        lists = (db.bazarLists || []).filter(b => b.type === 'family' && (familyMemberPhones.includes(b.creatorPhone) || familyMemberPhones.includes(b.assigneePhone)));
    } else {
        lists = (db.bazarLists || []).filter(b => b.type === 'personal' && (b.creatorPhone === currentUser.phone || b.assigneePhone === currentUser.phone));
    }

    if (!lists.length) {
        container.innerHTML = `<p class="text-xs text-slate-400 italic col-span-2 text-center py-4">কোনো বাজার তালিকা তৈরি করা নেই।</p>`;
        return;
    }

    lists.forEach(b => {
        const isSelfBazar = (b.assigneePhone === currentUser.phone);
        const isAssignedToMe = (isSelfBazar && b.status === 'pending');
        const isDraft = (b.status === 'draft');
        const creator = (db.users || []).find(u => u.phone === b.creatorPhone);
        const assignee = (db.users || []).find(u => u.phone === b.assigneePhone);

        let tagText = "নিজের বাজার";
        let tagBg = "bg-indigo-100 text-indigo-700";

        if (b.creatorPhone === currentUser.phone && b.assigneePhone !== currentUser.phone) {
            tagText = `${assignee ? assignee.name : 'অন্য সদস্য'}-কে দেওয়া`;
            tagBg = "bg-blue-100 text-blue-700";
        } else if (b.creatorPhone !== currentUser.phone && b.assigneePhone === currentUser.phone) {
            tagText = `${creator ? creator.name : 'পরিবার'}-এর দেওয়া দায়িত্ব`;
            tagBg = "bg-amber-100 text-amber-700";
        }

        let statusBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">চলমান</span>`;
        if (b.status === 'completed') {
            statusBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white">সম্পন্ন</span>`;
        } else if (isDraft) {
            statusBadge = `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-400 text-white">খসড়া (Draft)</span>`;
        }

        const card = document.createElement('div');
        card.className = `p-4 border rounded-xl ${b.status === 'completed' ? 'bg-emerald-50/60 border-emerald-200' : (isDraft ? 'bg-slate-50/80 border-slate-300 border-dashed' : 'bg-white border-slate-200')} shadow-sm space-y-3`;

        let itemsHtml = b.items.map(i => `
            <li class="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-slate-200">
                <span class="${i.isBought ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}">
                    ${i.isBought ? '✅' : '⚪'} ${i.name} <span class="text-slate-400">(${i.qty})</span>
                </span>
                <span class="${i.isBought ? 'text-emerald-700 font-bold' : 'text-slate-400'}">
                    ${b.status === 'completed' ? (i.isBought ? `৳${i.actualPrice}` : 'কেনা হয়নি') : (i.actualPrice ? `৳${i.actualPrice}` : (isDraft ? 'খসড়া' : 'অপেক্ষমান'))}
                </span>
            </li>
        `).join('');

        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">${b.title}</h4>
                    <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${tagBg}">
                        ${tagText}
                    </span>
                </div>
                ${statusBadge}
            </div>

            <ul class="bg-white/80 p-2.5 rounded-lg space-y-0.5 border border-slate-100">${itemsHtml}</ul>

            <div class="flex justify-between items-center pt-1 border-t border-slate-100">
                <div>
                    <p class="text-[10px] text-slate-400">মোট খরচ</p>
                    <p class="font-bold text-slate-800 text-sm">৳${b.totalSpent}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${isDraft ? `
                        <button onclick="publishBazarDraft('${b.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                            <i class="fa-solid fa-paper-plane text-[10px]"></i> বাজারে পাঠান
                        </button>
                        <button onclick="deleteBazarList('${b.id}')" class="bg-rose-100 text-rose-600 hover:bg-rose-200 text-xs font-bold px-2 py-1.5 rounded-lg transition">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : ''}

                    ${isAssignedToMe ? `
                        <button onclick="openFulfillBazarModal('${b.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                            <i class="fa-solid fa-cart-shopping text-[10px]"></i> ${b.status === 'completed' ? 'মেমো সংশোধন' : 'নিজে বাজার করুন / মেমো দিন'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openFulfillBazarModal(bazarId) {
    const bazar = (db.bazarLists || []).find(b => b.id === bazarId);
    if (!bazar) return;

    document.getElementById('fulfill-bazar-id').value = bazar.id;
    const container = document.getElementById('fulfill-items-container');
    container.innerHTML = '';

    bazar.items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "p-3 border rounded-xl bg-slate-50 space-y-2";
        div.innerHTML = `
            <div class="flex justify-between items-center font-bold text-sm">
                <span class="text-slate-800">${item.name} <span class="text-xs text-slate-500">(${item.qty})</span></span>
                <label class="text-xs cursor-pointer text-emerald-700 font-semibold flex items-center gap-1">
                    <input type="checkbox" id="bought-check-${index}" ${item.isBought ? 'checked' : ''} onchange="calculateFulfillTotal()" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"> কেনা হয়েছে
                </label>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500">প্রকৃত দাম: ৳</span>
                <input type="number" id="price-input-${index}" value="${item.actualPrice || ''}" oninput="calculateFulfillTotal()" placeholder="০.০০" class="w-full px-3 py-1 border rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500">
            </div>
        `;
        container.appendChild(div);
    });

    calculateFulfillTotal();
    openModal('modal-fulfill-bazar');
}

function calculateFulfillTotal() {
    const bazarId = document.getElementById('fulfill-bazar-id').value;
    const bazar = (db.bazarLists || []).find(b => b.id === bazarId);
    if (!bazar) return;

    let total = 0;
    bazar.items.forEach((item, index) => {
        const priceInput = document.getElementById(`price-input-${index}`);
        const isBought = document.getElementById(`bought-check-${index}`)?.checked;
        if (isBought && priceInput?.value) {
            total += parseFloat(priceInput.value);
        }
    });

    document.getElementById('fulfill-total-price').innerText = `৳${total.toLocaleString('bn-BD')}`;
}

function submitBazarFulfillment() {
    const bazarId = document.getElementById('fulfill-bazar-id').value;
    const bazar = (db.bazarLists || []).find(b => b.id === bazarId);
    if (!bazar) return;

    let totalSpent = 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    bazar.items.forEach((item, index) => {
        const priceInput = document.getElementById(`price-input-${index}`);
        const isBought = document.getElementById(`bought-check-${index}`).checked;
        const price = parseFloat(priceInput.value || 0);

        item.isBought = isBought;
        item.actualPrice = isBought ? price : 0;
        if (isBought) totalSpent += price;
    });

    bazar.status = 'completed';
    bazar.totalSpent = totalSpent;

    if (totalSpent > 0) {
        if (!db.expenses) db.expenses = [];
        db.expenses.push({
            id: 'exp_' + Date.now(),
            userPhone: currentUser.phone,
            date: todayStr,
            title: `${bazar.title} (বাজার মেমো)`,
            category: 'বাজার',
            amount: totalSpent,
            type: bazar.type
        });
    }

    saveDB(db);
    closeModal('modal-fulfill-bazar');
}

// ==========================================================================
// 9. INCOME, EXPENSE, BUDGET & MEMBER HANDLERS
// ==========================================================================
function handleAddIncome(e) {
    e.preventDefault();
    if (!db.incomes) db.incomes = [];
    db.incomes.push({
        id: 'inc_' + Date.now(),
        userPhone: currentUser.phone,
        date: document.getElementById('inc-date').value,
        title: document.getElementById('inc-title').value.trim(),
        amount: parseFloat(document.getElementById('inc-amount').value),
        type: document.getElementById('inc-type').value
    });
    saveDB(db);
    closeModal('modal-add-income');
}

function handleAddExpense(e) {
    e.preventDefault();
    if (!db.expenses) db.expenses = [];
    db.expenses.push({
        id: 'exp_' + Date.now(),
        userPhone: currentUser.phone,
        date: document.getElementById('exp-date').value,
        title: document.getElementById('exp-title').value.trim(),
        category: document.getElementById('exp-category').value,
        amount: parseFloat(document.getElementById('exp-amount').value),
        type: document.getElementById('exp-type').value
    });
    saveDB(db);
    closeModal('modal-add-expense');
}

function handleSetBudget(e) {
    e.preventDefault();
    const family = (db.families || []).find(f => f.id === currentUser.familyId);
    if (family) {
        family.budget = parseFloat(document.getElementById('input-budget-amount').value);
        saveDB(db);
        closeModal('modal-set-budget');
    }
}

function handleAddMember(e) {
    e.preventDefault();
    const name = document.getElementById('member-name').value.trim();
    const phone = document.getElementById('member-phone').value.trim();
    if (!db.users) db.users = [];
    db.users.push({ phone, name, role: 'member', familyId: currentUser.familyId });
    saveDB(db);
    closeModal('modal-add-member');
}

function renderFamilyMembers() {
    const container = document.getElementById('family-members-list');
    if (!container) return;
    container.innerHTML = '';
    const members = (db.users || []).filter(u => u.familyId === currentUser.familyId);

    members.forEach(m => {
        const memberIncome = (db.incomes || [])
            .filter(i => i.userPhone === m.phone && i.type === 'family')
            .reduce((sum, i) => sum + i.amount, 0);

        const card = document.createElement('div');
        card.className = "p-4 border rounded-xl bg-slate-50 flex items-center justify-between";
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div>
                    <p class="font-bold text-slate-800 text-sm">
                        ${m.name} ${m.role === 'head' ? '<span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">প্রধান</span>' : ''}
                    </p>
                    <p class="text-xs text-slate-500">${m.phone}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xs text-slate-500">জমা আয়</p>
                <p class="font-bold text-emerald-600 text-sm">৳${memberIncome}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================================================
// 10. MONTHLY REPORT & NOTIFICATIONS
// ==========================================================================
function generateMonthlyReportModalContent(selectedMonth, totalIncome, totalBudget, totalExpense, filteredExpenses) {
    const container = document.getElementById('monthly-report-content');
    if (!container) return;

    const remaining = totalBudget - totalExpense;
    const isOverBudget = totalExpense > totalBudget && totalBudget > 0;

    const categoryMap = {};
    filteredExpenses.forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    let categoryRows = Object.keys(categoryMap).map(cat => `
        <div class="flex justify-between items-center py-1.5 border-b border-dashed border-slate-200">
            <span class="text-slate-600 font-medium">${cat}</span>
            <span class="font-bold text-slate-800">৳${categoryMap[cat]}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="text-center pb-3 border-b">
            <h4 class="text-base font-bold text-slate-800">মাসিক হিসাবের বিস্তারিত রিপোর্ট</h4>
            <p class="text-xs text-indigo-600 font-semibold">মাস: ${selectedMonth || 'বর্তমান মাস'}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p class="text-slate-500">মোট আয়</p>
                <p class="text-lg font-bold text-emerald-700">৳${totalIncome}</p>
            </div>
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-slate-500">পরিকল্পিত বাজেট</p>
                <p class="text-lg font-bold text-blue-700">৳${totalBudget}</p>
            </div>
            <div class="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <p class="text-slate-500">মোট খরচ</p>
                <p class="text-lg font-bold text-rose-700">৳${totalExpense}</p>
            </div>
            <div class="p-3 ${isOverBudget ? 'bg-rose-100 border-rose-300' : 'bg-emerald-50 border-emerald-200'} rounded-lg border">
                <p class="text-slate-500">${isOverBudget ? 'অতিরিক্ত খরচ (ওভার)' : 'অবশিষ্ট সঞ্চয়'}</p>
                <p class="text-lg font-bold ${isOverBudget ? 'text-rose-700' : 'text-emerald-700'}">৳${Math.abs(remaining)}</p>
            </div>
        </div>

        <div>
            <h5 class="font-bold text-slate-700 text-xs uppercase mb-2">ক্যাটাগরিভিত্তিক ব্যয়ের তালিকা:</h5>
            <div class="bg-white p-3 rounded-lg border">
                ${categoryRows || '<p class="text-xs text-slate-400 italic">এই মাসে কোনো খরচ নেই</p>'}
            </div>
        </div>

        <div class="p-2 rounded-lg ${isOverBudget ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'} text-xs font-bold text-center">
            ${isOverBudget ? '⚠️ এই মাসে বাজেটের চেয়ে অতিরিক্ত খরচ হয়েছে!' : '✅ এই মাসের বাজেট সফলভাবে বজায় ছিল।'}
        </div>
    `;
}

function sendReportToAllMembers() {
    if (!currentUser.familyId) {
        alert('আপনার কোনো পরিবার গ্রুপ নেই!');
        return;
    }

    const selectedMonth = document.getElementById('filter-month').value;
    const members = (db.users || []).filter(u => u.familyId === currentUser.familyId);

    if (!db.notifications) db.notifications = [];

    members.forEach(m => {
        db.notifications.push({
            id: 'notif_' + Date.now() + Math.random(),
            forPhone: m.phone,
            message: `📢 ${currentUser.name} ${selectedMonth} মাসের চূড়ান্ত বাজেট ও খরচের ফাইনাল রিপোর্ট প্রকাশ করেছেন। নোটিফিকেশন প্যানেলে সামারি চেক করুন।`,
            date: new Date().toLocaleTimeString('bn-BD'),
            read: false
        });
    });

    saveDB(db);
    closeModal('modal-monthly-report');
    updateNotificationBadge();
    alert('পরিবারের সকল সদস্যের কাছে মাস শেষের রিপোর্ট নোটিফিকেশন আকারে পাঠানো হয়েছে!');
}

function toggleNotificationModal() {
    const modal = document.getElementById('modal-notifications');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        renderNotifications();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    container.innerHTML = '';
    const myNotifs = (db.notifications || []).filter(n => n.forPhone === currentUser.phone);

    if (!myNotifs.length) {
        container.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">কোনো নোটিফিকেশন নেই।</p>`;
        return;
    }

    let modified = false;
    myNotifs.forEach(n => {
        if (!n.read) modified = true;
        n.read = true;
        const div = document.createElement('div');
        div.className = "p-3 rounded-xl bg-slate-50 border text-xs space-y-1";
        div.innerHTML = `<p class="text-slate-700 font-medium">${n.message}</p><p class="text-[10px] text-slate-400">${n.date}</p>`;
        container.appendChild(div);
    });

    if (modified) saveDB(db);
    updateNotificationBadge();
}

function updateNotificationBadge() {
    if (!currentUser) return;
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    const unreadCount = (db.notifications || []).filter(n => n.forPhone === currentUser.phone && !n.read).length;
    if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ==========================================================================
// 11. MODAL HELPERS
// ==========================================================================
function openModal(id) {
    if (id === 'modal-add-bazar') populateBazarAssignees();
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}
