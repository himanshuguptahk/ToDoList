// Default Initial Categories
const defaultCategories = [
    { id: 'work', name: 'Work', color: '#3b82f6', isDefault: true },
    { id: 'personal', name: 'Personal', color: '#ec4899', isDefault: true }
];

// App Global State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || defaultCategories;
let currentFilter = 'all';
let currentCategory = 'all';
let searchQuery = '';
let activeTriggeredTask = null;

// DOM Elements
const taskForm = document.getElementById('add-task-form');
const taskTitleInput = document.getElementById('task-title-input');
const taskDateInput = document.getElementById('task-date-input');
const taskReminderInput = document.getElementById('task-reminder-input');
const taskCategoryInput = document.getElementById('task-category-input');
const taskPriorityInput = document.getElementById('task-priority-input');

const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const themeToggleBtn = document.getElementById('theme-toggle');
const enableNotifBtn = document.getElementById('enable-notif-btn');

const viewTitle = document.getElementById('view-title');
const currentDateEl = document.getElementById('current-date');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const categoryListEl = document.getElementById('category-list');
const toastContainer = document.getElementById('toast-container');

// Category Modal Elements
const catModal = document.getElementById('cat-modal');
const openCatModalBtn = document.getElementById('open-cat-modal-btn');
const closeCatModalBtn = document.getElementById('close-cat-modal');
const cancelCatBtn = document.getElementById('cancel-cat-btn');
const addCatForm = document.getElementById('add-cat-form');
const catNameInput = document.getElementById('cat-name-input');
const catColorInput = document.getElementById('cat-color-input');

// Reminder Modal Elements
const reminderModal = document.getElementById('reminder-modal');
const closeReminderModalBtn = document.getElementById('close-reminder-modal');
const reminderForm = document.getElementById('reminder-form');
const reminderTaskIdInput = document.getElementById('reminder-task-id');
const modalReminderDatetime = document.getElementById('modal-reminder-datetime');
const removeReminderBtn = document.getElementById('remove-reminder-btn');

// Banner Elements
const reminderBanner = document.getElementById('reminder-banner');
const bannerTaskTitle = document.getElementById('banner-task-title');
const bannerTaskDesc = document.getElementById('banner-task-desc');
const snoozeBtn = document.getElementById('snooze-btn');
const dismissBannerBtn = document.getElementById('dismiss-banner-btn');

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    setCurrentDate();
    loadTheme();
    renderCategories();
    renderApp();
    checkNotificationPermission();

    // Check reminders every 5 seconds
    setInterval(checkReminders, 5000);
});

// Toast System
function showAlert(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
        success: 'fa-circle-check',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation',
        danger: 'fa-circle-xmark'
    };

    toast.innerHTML = `
        <i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i>
        <span>${escapeHTML(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Chime Synthesizer
function playChimeSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
        // Fallback catch
    }
}

// Desktop Notifications
function checkNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            enableNotifBtn.style.display = 'none';
        } else {
            enableNotifBtn.style.display = 'flex';
        }
    } else {
        enableNotifBtn.style.display = 'none';
    }
}

enableNotifBtn.addEventListener('click', () => {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showAlert('Desktop notifications enabled!', 'success');
                enableNotifBtn.style.display = 'none';
            } else {
                showAlert('Notifications permission was denied.', 'warning');
            }
        });
    }
});

function setCurrentDate() {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);
}

function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Render Categories with Left Aligned Delete Button
function renderCategories() {
    categoryListEl.innerHTML = '';
    
    // All Category
    const allBtn = document.createElement('button');
    allBtn.className = `cat-btn ${currentCategory === 'all' ? 'active' : ''}`;
    allBtn.innerHTML = `
        <div class="cat-btn-content">
            <span class="dot" style="background-color: var(--text-secondary)"></span> All
        </div>
        <div class="cat-btn-right">
            <span class="cat-count">${tasks.length}</span>
        </div>
    `;
    allBtn.addEventListener('click', () => selectCategory('all'));
    categoryListEl.appendChild(allBtn);

    // Custom & Default Categories
    categories.forEach(cat => {
        const catTaskCount = tasks.filter(t => t.category === cat.name).length;
        const btn = document.createElement('button');
        btn.className = `cat-btn ${currentCategory === cat.name ? 'active' : ''}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'cat-btn-content';
        contentDiv.innerHTML = `<span class="dot" style="background-color: ${cat.color}"></span> ${escapeHTML(cat.name)}`;
        btn.appendChild(contentDiv);

        const rightDiv = document.createElement('div');
        rightDiv.className = 'cat-btn-right';

        if (!cat.isDefault) {
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-cat-btn';
            delBtn.title = 'Delete Category';
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCategory(cat.id);
            });
            rightDiv.appendChild(delBtn);
        }

        const countSpan = document.createElement('span');
        countSpan.className = 'cat-count';
        countSpan.textContent = catTaskCount;
        rightDiv.appendChild(countSpan);

        btn.appendChild(rightDiv);

        btn.addEventListener('click', () => selectCategory(cat.name));
        categoryListEl.appendChild(btn);
    });

    // Populate Select Options
    taskCategoryInput.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        taskCategoryInput.appendChild(option);
    });
}

function selectCategory(catName) {
    currentCategory = catName;
    renderCategories();
    renderApp();
}

// Add Task Form Handler
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    if (!title) return;

    const newTask = {
        id: Date.now().toString(),
        title: title,
        dueDate: taskDateInput.value || '',
        reminder: taskReminderInput.value || null,
        reminderNotified: false,
        category: taskCategoryInput.value || (categories[0] ? categories[0].name : 'Personal'),
        priority: taskPriorityInput.value || 'medium',
        completed: false,
        important: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    renderCategories();
    renderApp();

    showAlert('Task added successfully!', 'success');

    taskTitleInput.value = '';
    taskDateInput.value = '';
    taskReminderInput.value = '';
});

// Category Modal Handler
openCatModalBtn.addEventListener('click', () => catModal.classList.add('active'));
closeCatModalBtn.addEventListener('click', () => catModal.classList.remove('active'));
cancelCatBtn.addEventListener('click', () => catModal.classList.remove('active'));

addCatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = catNameInput.value.trim();
    const color = catColorInput.value;

    if (!name) return;

    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        showAlert('Category with this name already exists.', 'warning');
        return;
    }

    const newCategory = {
        id: Date.now().toString(),
        name: name,
        color: color,
        isDefault: false
    };

    categories.push(newCategory);
    saveCategories();
    renderCategories();
    catModal.classList.remove('active');
    catNameInput.value = '';
    showAlert(`Category "${name}" created!`, 'success');
});

function deleteCategory(id) {
    const catToDelete = categories.find(c => c.id === id);
    if (!catToDelete) return;

    categories = categories.filter(c => c.id !== id);

    if (currentCategory === catToDelete.name) {
        currentCategory = 'all';
    }

    tasks = tasks.map(task => {
        if (task.category === catToDelete.name) {
            return { ...task, category: 'Personal' };
        }
        return task;
    });

    saveCategories();
    saveTasks();
    renderCategories();
    renderApp();
    showAlert(`Deleted category "${catToDelete.name}".`, 'danger');
}

// Reminder Handlers
function openReminderModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    reminderTaskIdInput.value = task.id;
    modalReminderDatetime.value = task.reminder || '';
    reminderModal.classList.add('active');
}

closeReminderModalBtn.addEventListener('click', () => reminderModal.classList.remove('active'));

reminderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskId = reminderTaskIdInput.value;
    const newReminder = modalReminderDatetime.value;

    tasks = tasks.map(t => {
        if (t.id === taskId) {
            return { ...t, reminder: newReminder, reminderNotified: false };
        }
        return t;
    });

    saveTasks();
    renderApp();
    reminderModal.classList.remove('active');
    showAlert('Task reminder updated!', 'success');
});

removeReminderBtn.addEventListener('click', () => {
    const taskId = reminderTaskIdInput.value;
    tasks = tasks.map(t => {
        if (t.id === taskId) {
            return { ...t, reminder: null, reminderNotified: false };
        }
        return t;
    });

    saveTasks();
    renderApp();
    reminderModal.classList.remove('active');
    showAlert('Reminder cleared!', 'info');
});

// Reminder Interval Check
function checkReminders() {
    const now = new Date().getTime();

    tasks.forEach(task => {
        if (!task.completed && task.reminder && !task.reminderNotified) {
            const reminderTime = new Date(task.reminder).getTime();
            if (now >= reminderTime) {
                triggerReminder(task);
            }
        }
    });
}

function triggerReminder(task) {
    task.reminderNotified = true;
    saveTasks();

    playChimeSound();

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Task Reminder: ${task.title}`, {
            body: `Category: ${task.category} | Priority: ${task.priority.toUpperCase()}`,
            icon: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/bell.svg'
        });
    }

    activeTriggeredTask = task;
    bannerTaskTitle.textContent = task.title;
    bannerTaskDesc.textContent = `Due reminder for category "${task.category}"`;
    reminderBanner.classList.remove('hidden');

    renderApp();
}

snoozeBtn.addEventListener('click', () => {
    if (!activeTriggeredTask) return;
    const snoozeTime = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

    tasks = tasks.map(t => {
        if (t.id === activeTriggeredTask.id) {
            return { ...t, reminder: snoozeTime, reminderNotified: false };
        }
        return t;
    });

    saveTasks();
    renderApp();
    reminderBanner.classList.add('hidden');
    showAlert('Snoozed for 5 minutes', 'info');
});

dismissBannerBtn.addEventListener('click', () => {
    if (activeTriggeredTask) {
        toggleTaskComplete(activeTriggeredTask.id);
    }
    reminderBanner.classList.add('hidden');
});

function toggleTaskComplete(id) {
    let taskTitle = '';
    let isDone = false;

    tasks = tasks.map(task => {
        if (task.id === id) {
            taskTitle = task.title;
            isDone = !task.completed;
            return { ...task, completed: !task.completed };
        }
        return task;
    });

    saveTasks();
    renderCategories();
    renderApp();

    if (isDone) {
        showAlert(`Completed: "${taskTitle}"`, 'success');
    }
}

function toggleTaskImportant(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            const newImp = !task.important;
            showAlert(newImp ? 'Marked as Important' : 'Removed from Important', 'info');
            return { ...task, important: newImp };
        }
        return task;
    });

    saveTasks();
    renderApp();
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderCategories();
    renderApp();
    showAlert('Task deleted', 'danger');
}

// Nav Buttons Filtering
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;

        viewTitle.textContent = btn.innerText.trim().replace(/[0-9]/g, '');
        renderApp();
    });
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderApp();
});

function getFilteredTasks() {
    return tasks.filter(task => {
        let matchesNav = true;
        const todayStr = new Date().toISOString().split('T')[0];

        if (currentFilter === 'today') {
            matchesNav = task.dueDate === todayStr;
        } else if (currentFilter === 'important') {
            matchesNav = task.important;
        } else if (currentFilter === 'completed') {
            matchesNav = task.completed;
        }

        let matchesCat = (currentCategory === 'all') || (task.category === currentCategory);
        let matchesSearch = task.title.toLowerCase().includes(searchQuery);

        return matchesNav && matchesCat && matchesSearch;
    });
}

// Render Tasks
function renderApp() {
    const filteredTasks = getFilteredTasks();
    taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;

            const now = new Date().getTime();
            const isOverdue = task.reminder && (new Date(task.reminder).getTime() < now) && !task.completed;
            const reminderFormatted = task.reminder ? new Date(task.reminder).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            li.innerHTML = `
                <div class="task-left">
                    <div class="checkbox-custom" onclick="toggleTaskComplete('${task.id}')">
                        ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                    </div>
                    <div class="task-info">
                        <span class="task-text">${escapeHTML(task.title)}</span>
                        <div class="task-tags">
                            <span class="tag category">${escapeHTML(task.category)}</span>
                            <span class="tag priority-${task.priority}">${capitalize(task.priority)}</span>
                            ${task.dueDate ? `<span class="tag date"><i class="fa-regular fa-calendar"></i> ${task.dueDate}</span>` : ''}
                            ${task.reminder ? `<span class="tag reminder-badge ${isOverdue ? 'overdue' : ''}"><i class="fa-solid fa-bell"></i> ${reminderFormatted}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="task-right">
                    <button class="action-btn reminder-btn ${task.reminder ? 'active-reminder' : ''}" onclick="openReminderModal('${task.id}')" title="Set Reminder">
                        <i class="fa-${task.reminder ? 'solid' : 'regular'} fa-bell"></i>
                    </button>
                    <button class="action-btn star-btn ${task.important ? 'starred' : ''}" onclick="toggleTaskImportant('${task.id}')" title="Star Task">
                        <i class="fa-${task.important ? 'solid' : 'regular'} fa-star"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Delete Task">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }

    updateCounters();
    updateProgressBar();
}

function updateCounters() {
    const todayStr = new Date().toISOString().split('T')[0];

    document.getElementById('count-all').textContent = tasks.length;
    document.getElementById('count-today').textContent = tasks.filter(t => t.dueDate === todayStr).length;
    document.getElementById('count-important').textContent = tasks.filter(t => t.important).length;
    document.getElementById('count-completed').textContent = tasks.filter(t => t.completed).length;
}

function updateProgressBar() {
    if (tasks.length === 0) {
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        return;
    }

    const completedCount = tasks.filter(t => t.completed).length;
    const percentage = Math.round((completedCount / tasks.length) * 100);

    progressFill.style.width = `${percentage}%`;
    progressPercent.textContent = `${percentage}%`;
}

// Dark Mode Toggle
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggleBtn.innerHTML = isDark 
        ? '<i class="fa-solid fa-sun"></i> Light Mode' 
        : '<i class="fa-solid fa-moon"></i> Dark Mode';
    
    showAlert(`Switched to ${isDark ? 'Dark' : 'Light'} Mode`, 'info');
});

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i> Light Mode';
    }
}

// Helpers
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}