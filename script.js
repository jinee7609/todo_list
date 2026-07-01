import { createClient } from '@supabase/supabase-js';

const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// ── 상태 ──
let todos = [];
let groups = [];
let currentTab = 'all';
let selectedGroupId = null;
let selectedIds = new Set();
let currentUser = null;
let authMode = 'signin';

// ── DOM: 앱 ──
const taskInput = document.getElementById('taskInput');
const descInput = document.getElementById('descInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const tabBtns = document.querySelectorAll('.tab-btn');
const deleteBar = document.getElementById('deleteBar');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const selectedCountEl = document.getElementById('selectedCount');
const groupListEl = document.getElementById('groupList');
const addGroupBtn = document.getElementById('addGroupBtn');
const groupSelectEl = document.getElementById('groupSelect');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');

// ── DOM: 인증 ──
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authMessage = document.getElementById('authMessage');
const authTabs = document.querySelectorAll('.auth-tab');

// ── 화면 전환 ──
function showAuth() {
  currentUser = null;
  todos = [];
  groups = [];
  authScreen.style.display = 'flex';
  appScreen.style.display = 'none';
  authEmail.value = '';
  authPassword.value = '';
  setAuthMessage('');
}

function showApp(user) {
  currentUser = user;
  userEmailEl.textContent = user.email;
  authScreen.style.display = 'none';
  appScreen.style.display = 'block';
  loadData();
}

// ── 인증 탭 ──
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.mode;
    authTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    authSubmitBtn.textContent = authMode === 'signin' ? '로그인' : '회원가입';
    setAuthMessage('');
  });
});

function setAuthMessage(msg, isSuccess = false) {
  authMessage.textContent = msg;
  authMessage.className = 'auth-message' + (isSuccess ? ' success' : '');
}

// ── 회원가입 ──
async function signUp() {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) { setAuthMessage('이메일과 비밀번호를 입력하세요.'); return; }

  authSubmitBtn.disabled = true;
  const { error } = await db.auth.signUp({ email, password });
  authSubmitBtn.disabled = false;

  if (error) { setAuthMessage(error.message); return; }
  setAuthMessage('인증 이메일을 발송했습니다. 메일함을 확인해주세요!', true);
}

// ── 로그인 ──
async function signIn() {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) { setAuthMessage('이메일과 비밀번호를 입력하세요.'); return; }

  authSubmitBtn.disabled = true;
  const { error } = await db.auth.signInWithPassword({ email, password });
  authSubmitBtn.disabled = false;

  if (error) { setAuthMessage(error.message); return; }
  // onAuthStateChange가 자동으로 showApp 호출
}

// ── 로그아웃 ──
async function signOut() {
  await db.auth.signOut();
  // onAuthStateChange가 자동으로 showAuth 호출
}

// ── 인증 이벤트 ──
authSubmitBtn.addEventListener('click', () => {
  if (authMode === 'signup') signUp();
  else signIn();
});
authEmail.addEventListener('keydown', e => { if (e.key === 'Enter') authPassword.focus(); });
authPassword.addEventListener('keydown', e => { if (e.key === 'Enter') authSubmitBtn.click(); });
logoutBtn.addEventListener('click', signOut);

// ── 데이터 로드 ──
async function loadData() {
  const [{ data: groupsData, error: gErr }, { data: todosData, error: tErr }] = await Promise.all([
    db.from('groups').select('*').order('created_at'),
    db.from('todos').select('*').order('created_at')
  ]);

  if (gErr || tErr) {
    const msg = (gErr || tErr).message;
    console.error('데이터 로드 실패:', gErr || tErr);
    alert('데이터 로드 실패: ' + msg);
    return;
  }

  groups = groupsData || [];
  todos = todosData || [];
  renderGroups();
  renderGroupSelect();
  render();
}

// ── 그룹 관리 ──
function renderGroups() {
  groupListEl.innerHTML = '';

  const allLi = document.createElement('li');
  allLi.className = 'group-item' + (selectedGroupId === null ? ' active' : '');
  allLi.textContent = '전체 그룹';
  allLi.addEventListener('click', () => { selectedGroupId = null; renderGroups(); render(); });
  groupListEl.appendChild(allLi);

  groups.forEach(g => {
    const li = document.createElement('li');
    li.className = 'group-item' + (selectedGroupId === g.id ? ' active' : '');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = g.name;
    li.addEventListener('click', () => { selectedGroupId = g.id; renderGroups(); render(); });

    const delBtn = document.createElement('button');
    delBtn.className = 'group-delete-btn';
    delBtn.textContent = '×';
    delBtn.title = '그룹 삭제';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deleteGroup(g.id); });

    li.append(nameSpan, delBtn);
    groupListEl.appendChild(li);
  });
}

function renderGroupSelect() {
  groupSelectEl.innerHTML = '<option value="">그룹 없음</option>';
  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelectEl.appendChild(opt);
  });
}

async function addGroup() {
  const name = prompt('새 그룹 이름을 입력하세요');
  if (!name || !name.trim()) return;

  const { data, error } = await db.from('groups').insert({
    name: name.trim(),
    user_id: currentUser.id
  }).select().single();
  if (error) { alert('그룹 추가 실패: ' + error.message); return; }

  groups.push(data);
  renderGroups();
  renderGroupSelect();
}

async function deleteGroup(id) {
  if (!confirm('그룹을 삭제하면 해당 그룹의 항목이 그룹 없음으로 변경됩니다. 삭제할까요?')) return;

  const { error } = await db.from('groups').delete().eq('id', id);
  if (error) { alert('그룹 삭제 실패: ' + error.message); return; }

  groups = groups.filter(g => g.id !== id);
  todos = todos.map(t => t.group_id === id ? { ...t, group_id: null } : t);
  if (selectedGroupId === id) selectedGroupId = null;
  renderGroups();
  renderGroupSelect();
  render();
}

// ── 할 일 관리 ──
async function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const description = descInput.value.trim() || null;
  const group_id = groupSelectEl.value || null;

  const { data, error } = await db.from('todos').insert({
    text,
    description,
    done: false,
    group_id,
    completed_at: null,
    user_id: currentUser.id
  }).select().single();

  if (error) { console.error('할 일 추가 실패:', error); alert('할 일 추가 실패: ' + error.message); return; }

  todos.push(data);
  taskInput.value = '';
  descInput.value = '';
  taskInput.focus();
  render();
}

function formatDate(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function toggleDone(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const done = !todo.done;
  const completed_at = done ? formatDate(new Date()) : null;

  const { error } = await db.from('todos').update({ done, completed_at }).eq('id', id);
  if (error) { alert('상태 변경 실패: ' + error.message); return; }

  todos = todos.map(t => t.id === id ? { ...t, done, completed_at } : t);
  selectedIds.delete(id);
  render();
}

async function deleteTask(id) {
  const { error } = await db.from('todos').delete().eq('id', id);
  if (error) { alert('삭제 실패: ' + error.message); return; }

  todos = todos.filter(t => t.id !== id);
  selectedIds.delete(id);
  render();
}

async function deleteSelected() {
  const ids = [...selectedIds];

  const { error } = await db.from('todos').delete().in('id', ids);
  if (error) { alert('삭제 실패: ' + error.message); return; }

  todos = todos.filter(t => !selectedIds.has(t.id));
  selectedIds.clear();
  render();
}

// ── 필터 & 렌더 ──
function filteredTodos() {
  let list = selectedGroupId === null ? todos : todos.filter(t => t.group_id === selectedGroupId);
  if (currentTab === 'progress') return list.filter(t => !t.done);
  if (currentTab === 'completed') return list.filter(t => t.done);
  return list;
}

function render() {
  const items = filteredTodos();
  todoList.innerHTML = '';

  selectedIds = new Set([...selectedIds].filter(id => todos.find(t => t.id === id && t.done)));

  const selCount = selectedIds.size;
  const showBar = selCount > 0 && currentTab !== 'progress';
  deleteBar.style.display = showBar ? 'flex' : 'none';
  if (showBar) selectedCountEl.textContent = `${selCount}개 선택됨`;

  if (items.length === 0) {
    todoList.innerHTML = '<li class="empty-msg">할 일이 없습니다.</li>';
    return;
  }

  items.forEach(todo => {
    const li = document.createElement('li');
    const group = groups.find(g => g.id === todo.group_id);

    if (todo.done) {
      li.className = 'todo-item done' + (selectedIds.has(todo.id) ? ' selected' : '');

      const selectBox = document.createElement('input');
      selectBox.type = 'checkbox';
      selectBox.className = 'select-box';
      selectBox.checked = selectedIds.has(todo.id);
      selectBox.addEventListener('change', () => {
        if (selectBox.checked) selectedIds.add(todo.id);
        else selectedIds.delete(todo.id);
        render();
      });

      const textWrap = document.createElement('div');
      textWrap.className = 'text-wrap';

      const span = document.createElement('span');
      span.className = 'text';
      span.textContent = todo.text;

      const time = document.createElement('span');
      time.className = 'completed-at';
      time.textContent = todo.completed_at || '';

      textWrap.append(span, time);
      if (todo.description) {
        const desc = document.createElement('span');
        desc.className = 'desc';
        desc.textContent = todo.description;
        textWrap.appendChild(desc);
      }
      li.append(selectBox, textWrap);
    } else {
      li.className = 'todo-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      checkbox.addEventListener('change', () => toggleDone(todo.id));

      const textWrap = document.createElement('div');
      textWrap.className = 'text-wrap';

      const span = document.createElement('span');
      span.className = 'text';
      span.textContent = todo.text;

      textWrap.appendChild(span);
      if (todo.description) {
        const desc = document.createElement('span');
        desc.className = 'desc';
        desc.textContent = todo.description;
        textWrap.appendChild(desc);
      }
      if (group) {
        const badge = document.createElement('span');
        badge.className = 'group-badge';
        badge.textContent = group.name;
        textWrap.appendChild(badge);
      }

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '×';
      del.title = '삭제';
      del.addEventListener('click', () => deleteTask(todo.id));

      li.append(checkbox, textWrap, del);
    }

    todoList.appendChild(li);
  });
}

// ── 앱 이벤트 ──
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
deleteSelectedBtn.addEventListener('click', deleteSelected);
addGroupBtn.addEventListener('click', addGroup);

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentTab = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// ── 인증 상태 감지 (초기 세션 포함) ──
db.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp(session.user);
  } else {
    showAuth();
  }
});
