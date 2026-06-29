let todos = [];
let groups = [];
let currentTab = 'all';
let selectedGroupId = null;
let selectedIds = new Set();

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

function addGroup() {
  const name = prompt('새 그룹 이름을 입력하세요');
  if (!name || !name.trim()) return;
  groups.push({ id: Date.now(), name: name.trim() });
  renderGroups();
}

function deleteGroup(id) {
  if (!confirm('그룹을 삭제하면 해당 그룹의 항목이 그룹 없음으로 변경됩니다. 삭제할까요?')) return;
  groups = groups.filter(g => g.id !== id);
  todos = todos.map(t => t.groupId === id ? { ...t, groupId: null } : t);
  if (selectedGroupId === id) selectedGroupId = null;
  renderGroups();
  render();
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  const description = descInput.value.trim();
  todos.push({ id: Date.now(), text, description, done: false, completedAt: null });
  taskInput.value = '';
  descInput.value = '';
  taskInput.focus();
  render();
}

function formatDate(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toggleDone(id) {
  todos = todos.map(t => {
    if (t.id !== id) return t;
    const done = !t.done;
    return { ...t, done, completedAt: done ? formatDate(new Date()) : null };
  });
  selectedIds.delete(id);
  render();
}

function deleteTask(id) {
  todos = todos.filter(t => t.id !== id);
  selectedIds.delete(id);
  render();
}

function deleteSelected() {
  todos = todos.filter(t => !selectedIds.has(t.id));
  selectedIds.clear();
  render();
}

function filteredTodos() {
  if (currentTab === 'progress') return todos.filter(t => !t.done);
  if (currentTab === 'completed') return todos.filter(t => t.done);
  return todos;
}

function render() {
  const items = filteredTodos();
  todoList.innerHTML = '';

  // 완료 상태가 아닌 항목은 선택 해제
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

    if (todo.done) {
      // 완료 항목: 옵션 체크박스로 선택 후 삭제
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
      time.textContent = todo.completedAt || '';

      textWrap.append(span, time);
      if (todo.description) {
        const desc = document.createElement('span');
        desc.className = 'desc';
        desc.textContent = todo.description;
        textWrap.appendChild(desc);
      }
      li.append(selectBox, textWrap);
    } else {
      // 진행 중 항목: 완료 체크박스 + 즉시 삭제 버튼
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

renderGroups();
render();
