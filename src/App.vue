<script setup>
import { ref, onMounted, nextTick } from 'vue'

// --- State Definitions ---
const tasks = ref([])
const activeTaskId = ref(null)
const lastDoneTask = ref(null)
const history = ref([])
const showHistory = ref(false)
const newTaskName = ref('')

// Editing state
const editingTaskId = ref(null)
const editingName = ref('')
const editInputRef = ref(null)
const hasUsedDoubleClick = ref(false)

// Theme selection: 'auto' | 'light' | 'dark'
const theme = ref('auto')

// Drag and drop state
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

// PWA Install state
const deferredPrompt = ref(null)
const showInstallBtn = ref(false)

// --- LocalStorage Keys ---
const STORAGE_KEYS = {
  TASKS: 'waied_tasks_v1',
  ACTIVE: 'waied_active_id_v1',
  LAST_DONE: 'waied_last_done_v1',
  HISTORY: 'waied_history_v1',
  THEME: 'waied_theme_v1',
  HAS_EDITED: 'waied_has_edited_v1'
}

function loadState() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS)
    if (savedTasks) {
      tasks.value = JSON.parse(savedTasks)
    } else {
      // Seed starter tasks
      tasks.value = [
        { id: '1', name: '👋 Welcome! Click me to set as active focus.' },
        { id: '2', name: '✏️ Double-click this task to edit its name.' },
        { id: '3', name: '↕️ Drag me up or down to reorder the list.' }
      ]
    }

    const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE)
    if (savedActive) {
      activeTaskId.value = savedActive
    } else if (tasks.value.length > 0) {
      activeTaskId.value = tasks.value[0].id
    }

    const savedLastDone = localStorage.getItem(STORAGE_KEYS.LAST_DONE)
    if (savedLastDone) {
      lastDoneTask.value = JSON.parse(savedLastDone)
    }

    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY)
    if (savedHistory) {
      history.value = JSON.parse(savedHistory)
    }

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
    if (savedTheme) {
      theme.value = savedTheme
    }

    const savedHasEdited = localStorage.getItem(STORAGE_KEYS.HAS_EDITED)
    if (savedHasEdited) {
      hasUsedDoubleClick.value = JSON.parse(savedHasEdited)
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e)
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks.value))
}

function saveActiveTask() {
  if (activeTaskId.value) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE, activeTaskId.value)
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE)
  }
}

function saveLastDone() {
  if (lastDoneTask.value) {
    localStorage.setItem(STORAGE_KEYS.LAST_DONE, JSON.stringify(lastDoneTask.value))
  } else {
    localStorage.removeItem(STORAGE_KEYS.LAST_DONE)
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.value))
}

// --- Theme Logic ---
function applyTheme() {
  const root = document.documentElement
  const body = document.body
  
  // Reset existing custom theme classes
  root.classList.remove('light-theme', 'dark-theme')
  
  if (theme.value === 'light') {
    root.classList.add('light-theme')
  } else if (theme.value === 'dark') {
    root.classList.add('dark-theme')
  } else {
    // Auto: Let media query in style.css handle it natively, 
    // but we can query it dynamically for secondary classes if needed
  }
}

function toggleTheme() {
  if (theme.value === 'auto') {
    theme.value = 'light'
  } else if (theme.value === 'light') {
    theme.value = 'dark'
  } else {
    theme.value = 'auto'
  }
  localStorage.setItem(STORAGE_KEYS.THEME, theme.value)
  applyTheme()
}

// --- Audio Synthesis (Offline-Friendly Focus Chime) ---
function playCompleteSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    osc.type = 'sine'
    // Play a delightful double chime (C6 then G6)
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime) // C6
    osc.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.08) // G6
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch (err) {
    console.log('Audio playback blocked or unsupported:', err)
  }
}

// --- Operations ---
function addTask() {
  const name = newTaskName.value.trim()
  if (!name) return
  if (tasks.value.length >= 5) return
  
  const newId = Date.now().toString()
  tasks.value.push({ id: newId, name })
  newTaskName.value = ''
  
  if (tasks.value.length === 1) {
    activeTaskId.value = newId
    saveActiveTask()
  }
  
  saveTasks()
}

function selectTask(id) {
  if (editingTaskId.value) return 
  activeTaskId.value = id
  saveActiveTask()
}

function startEdit(task) {
  editingTaskId.value = task.id
  editingName.value = task.name
  
  // Set double-click has-been-used state
  if (!hasUsedDoubleClick.value) {
    hasUsedDoubleClick.value = true
    localStorage.setItem(STORAGE_KEYS.HAS_EDITED, 'true')
  }
  
  nextTick(() => {
    if (editInputRef.value && editInputRef.value[0]) {
      editInputRef.value[0].focus()
    }
  })
}

function saveEdit(task) {
  if (editingTaskId.value !== task.id) return
  
  const trimmed = editingName.value.trim()
  if (trimmed) {
    task.name = trimmed
    saveTasks()
  } else {
    removeTask(task.id)
  }
  
  editingTaskId.value = null
  editingName.value = ''
}

function removeTask(id) {
  tasks.value = tasks.value.filter(t => t.id !== id)
  saveTasks()
  
  if (activeTaskId.value === id) {
    activeTaskId.value = tasks.value.length > 0 ? tasks.value[0].id : null
    saveActiveTask()
  }
}

function completeTask(task, index) {
  playCompleteSound()
  
  const completedTask = {
    id: task.id,
    name: task.name,
    doneAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  lastDoneTask.value = completedTask
  saveLastDone()
  
  history.value.unshift(completedTask)
  if (history.value.length > 50) {
    history.value.pop()
  }
  saveHistory()
  
  removeTask(task.id)
}

function dismissLastDone() {
  lastDoneTask.value = null
  saveLastDone()
}

function clearHistory() {
  if (confirm('Are you sure you want to clear your entire history?')) {
    history.value = []
    saveHistory()
  }
}

// --- Native Drag and Drop ---
function onDragStart(index) {
  draggedIndex.value = index
}

function onDragOver(index, event) {
  event.preventDefault()
  dragOverIndex.value = index
}

function onDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

function onDrop(index) {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    const items = [...tasks.value]
    const [draggedItem] = items.splice(draggedIndex.value, 1)
    items.splice(index, 0, draggedItem)
    tasks.value = items
    saveTasks()
  }
  onDragEnd()
}

// --- Lifecycle & Initialization ---
onMounted(() => {
  loadState()
  applyTheme()
  
  // Listen for system theme changes in auto mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'auto') {
      applyTheme()
    }
  })
  
  // PWA Setup
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallBtn.value = true
  })
  
  window.addEventListener('appinstalled', () => {
    showInstallBtn.value = false
    deferredPrompt.value = null
  })
  
  // Suggest a compact size if running inside a standalone desktop window
  if (window.matchMedia('(display-mode: standalone)').matches) {
    window.resizeTo(420, 720)
  }
})

async function triggerInstall() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    showInstallBtn.value = false
  }
  deferredPrompt.value = null
}
</script>

<template>
  <div class="app-container neo-card">
    <!-- Header -->
    <header class="app-header">
      <div class="header-main">
        <h1 class="logo-text">WAIED?</h1>
        <div class="header-actions">
          <!-- Theme Switcher (Icons Only) -->
          <button 
            class="neo-btn toggle-theme-btn" 
            @click="toggleTheme"
            :title="`Theme: ${theme.toUpperCase()} (Click to toggle)`"
            aria-label="Toggle dark mode theme"
          >
            <!-- Sun (Light) -->
            <svg v-if="theme === 'light'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <!-- Moon (Dark) -->
            <svg v-else-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
            <!-- Monitor (Auto) -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <rect width="20" height="14" x="2" y="3" rx="2"/>
              <line x1="8" x2="16" y1="21" y2="21"/>
              <line x1="12" x2="12" y1="17" y2="21"/>
            </svg>
          </button>

          <!-- History -->
          <button 
            class="neo-btn toggle-history-btn" 
            :class="{ 'neo-btn-yellow': showHistory }"
            @click="showHistory = !showHistory" 
            aria-label="View history"
            title="View History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 8v4l3 3"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </button>
        </div>
      </div>
      <p class="tagline">What am I even doing?</p>
    </header>

    <!-- PWA Install Banner -->
    <div v-if="showInstallBtn" class="install-banner neo-card">
      <span class="install-text">💡 Install app to run standalone</span>
      <button class="neo-btn neo-btn-blue btn-sm" @click="triggerInstall">Install</button>
    </div>

    <!-- Task Creator -->
    <div class="input-section">
      <form @submit.prevent="addTask" class="input-form">
        <input 
          v-model="newTaskName" 
          type="text" 
          class="neo-input" 
          placeholder="Add a priority..."
          :disabled="tasks.length >= 5"
          maxlength="80"
        />
        <button 
          type="submit" 
          class="neo-btn neo-btn-pink add-btn"
          :disabled="tasks.length >= 5"
        >
          +
        </button>
      </form>
      <!-- Limit Warning -->
      <div v-if="tasks.length >= 5" class="warning-banner">
        ⚠️ Attention capped! Complete a task to add more.
      </div>
    </div>

    <!-- Active Focus Banner -->
    <div v-if="tasks.length > 0" class="focus-indicator">
      <div class="indicator-tag">CURRENT FOCUS</div>
      <div class="focus-title">
        {{ tasks.find(t => t.id === activeTaskId)?.name || 'Select a task below' }}
      </div>
    </div>

    <!-- Task List (Shows 3-5 items max) -->
    <main class="tasks-section">
      <div v-if="tasks.length === 0" class="empty-state">
        <p>No active tasks.</p>
        <p class="empty-subtitle">Add a task above to start focusing.</p>
      </div>

      <div 
        v-else 
        class="tasks-list"
      >
        <div 
          v-for="(task, index) in tasks" 
          :key="task.id"
          class="task-item neo-card"
          :class="{ 
            'active-task': task.id === activeTaskId,
            'dragging': draggedIndex === index,
            'drag-over': dragOverIndex === index
          }"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover="onDragOver(index, $event)"
          @dragend="onDragEnd"
          @drop="onDrop(index)"
          @click="selectTask(task.id)"
        >
          <!-- Left Drag Handle / Icon -->
          <div class="drag-handle" title="Drag to reorder">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="5" r="1"/>
              <circle cx="9" cy="12" r="1"/>
              <circle cx="9" cy="19" r="1"/>
              <circle cx="15" cy="5" r="1"/>
              <circle cx="15" cy="12" r="1"/>
              <circle cx="15" cy="19" r="1"/>
            </svg>
          </div>

          <!-- Main Checkbox -->
          <label class="neo-checkbox-container" @click.stop>
            <input 
              type="checkbox" 
              @change="completeTask(task, index)" 
            />
            <span class="neo-checkmark">
              <svg class="check-svg" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
          </label>

          <!-- Text Container / Edit Form -->
          <div class="task-content">
            <template v-if="editingTaskId === task.id">
              <input 
                v-model="editingName" 
                ref="editInputRef"
                type="text" 
                class="neo-input edit-input"
                @blur="saveEdit(task)"
                @keyup.enter="saveEdit(task)"
                @keyup.escape="editingTaskId = null"
                @click.stop
              />
            </template>
            <span 
              v-else 
              class="task-text" 
              @dblclick.stop="startEdit(task)"
              title="Double-click to edit"
            >
              {{ task.name }}
            </span>
          </div>

          <!-- Delete Button (Only displays on hover/edit) -->
          <button 
            class="delete-btn" 
            @click.stop="removeTask(task.id)"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    </main>

    <!-- Most Recently Done Banner -->
    <footer class="app-footer">
      <div v-if="lastDoneTask" class="last-done-banner neo-card pop-entry">
        <div class="last-done-info">
          <span class="done-badge">DONE</span>
          <span class="last-done-text">{{ lastDoneTask.name }}</span>
        </div>
        <button class="dismiss-done-btn" @click="dismissLastDone" title="Dismiss">
          ✕
        </button>
      </div>
      <!-- Tip is permanently removed after first use of rename/double-click edit -->
      <p v-else-if="!hasUsedDoubleClick" class="footer-tip">💡 Double-click a task to rename</p>
    </footer>

    <!-- History Drawer Overlay -->
    <div v-if="showHistory" class="history-overlay" @click="showHistory = false"></div>

    <!-- History Drawer -->
    <transition name="drawer">
      <aside v-if="showHistory" class="history-drawer neo-card">
        <div class="drawer-header">
          <h2>Completed History</h2>
          <button class="neo-btn btn-sm" @click="showHistory = false" title="Close">✕</button>
        </div>

        <div class="drawer-content">
          <div v-if="history.length === 0" class="history-empty">
            <p>No completed tasks yet.</p>
            <p class="empty-subtitle">Tick off tasks to see them here.</p>
          </div>
          
          <div v-else class="history-list">
            <div 
              v-for="item in history" 
              :key="item.id" 
              class="history-item"
            >
              <div class="history-item-check">✓</div>
              <div class="history-item-details">
                <span class="history-item-name">{{ item.name }}</span>
                <span class="history-item-time">{{ item.doneAt }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="drawer-footer" v-if="history.length > 0">
          <button class="neo-btn neo-btn-orange w-full" @click="clearHistory">
            Clear History
          </button>
        </div>
      </aside>
    </transition>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  max-width: 420px;
  background-color: var(--bg-card);
  padding: 24px;
  margin: 10vh auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
}

/* Header styling */
.app-header {
  border-bottom: 2px dashed var(--border-color);
  padding-bottom: 12px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-text {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1px;
  text-transform: uppercase;
  color: var(--text-main);
  margin: 0;
  line-height: 1;
}

.tagline {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.toggle-theme-btn,
.toggle-history-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 0;
}

/* Install Banner */
.install-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: rgba(61, 124, 255, 0.1);
  border-width: 2px;
  font-size: 13px;
  font-weight: 600;
}

.install-text {
  color: var(--accent-blue);
}

/* Input Section */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-form {
  display: flex;
  gap: 8px;
}

.add-btn {
  font-size: 22px;
  width: 50px;
  height: 47px;
  flex-shrink: 0;
}

.warning-banner {
  background-color: var(--accent-orange);
  color: #000000;
  border: 2px solid var(--border-color);
  font-size: 12px;
  font-weight: 800;
  padding: 6px;
  text-align: center;
  text-transform: uppercase;
}

/* Focus Indicator Banner */
.focus-indicator {
  background-color: var(--accent-active);
  border: var(--border-width) solid var(--border-color);
  box-shadow: 2px 2px 0px 0px var(--shadow-color);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-on-accent); /* Ensure text remains highly readable */
}

.indicator-tag {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--text-on-accent);
  opacity: 0.8;
}

.focus-title {
  font-size: 18px;
  font-weight: 800;
  word-wrap: break-word;
}

/* Task List */
.tasks-section {
  flex-grow: 1;
  min-height: 200px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  font-weight: 800;
  font-size: 16px;
  color: var(--text-muted);
  border: 2px dashed var(--border-color);
}

.empty-subtitle {
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  background-color: var(--bg-card);
  border-width: 2.5px;
  box-shadow: 2px 2px 0px 0px var(--shadow-color);
  user-select: none;
  position: relative;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.task-item:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px 0px var(--shadow-color);
}

/* Active Highlight */
.task-item.active-task {
  background-color: var(--accent-active);
  border-width: var(--border-width);
  box-shadow: 4px 4px 0px 0px var(--shadow-color);
  transform: translate(-2px, -2px);
  color: var(--text-on-accent); /* Ensure text remains readable */
}

.task-item.active-task:hover {
  transform: translate(-2px, -2px);
}

.task-item.drag-over {
  border-color: var(--accent-orange);
  background-color: rgba(255, 120, 73, 0.1);
  border-style: dashed;
}

.drag-handle {
  color: var(--text-muted);
  margin-right: 8px;
  cursor: grab;
  display: flex;
  align-items: center;
}

.task-item.active-task .drag-handle {
  color: #000000;
}

.task-content {
  flex-grow: 1;
  margin-left: 10px;
  min-width: 0;
}

.task-text {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.edit-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 14px;
  border-width: 2px;
  box-shadow: none;
}

.check-svg {
  opacity: 0;
  transition: opacity 0.1s ease;
}

.neo-checkbox-container input:checked ~ .neo-checkmark .check-svg {
  opacity: 1;
  color: #000000;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  padding: 4px 8px;
  margin-left: 6px;
  opacity: 0;
  color: var(--text-main);
  transition: opacity 0.1s ease;
}

.task-item:hover .delete-btn {
  opacity: 0.8;
}

.delete-btn:hover {
  color: var(--accent-pink) !important;
  opacity: 1 !important;
}

/* Footer & Recently Done */
.app-footer {
  margin-top: auto;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-tip {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
}

.last-done-banner {
  width: 100%;
  background-color: var(--accent-green);
  color: var(--text-on-accent);
  border-width: var(--border-width);
  box-shadow: var(--shadow-hover);
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-done-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.done-badge {
  background-color: #000000;
  color: #ffffff;
  font-size: 9px;
  font-weight: 900;
  padding: 2px 4px;
  border-radius: 0;
  letter-spacing: 0.5px;
}

.last-done-text {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dismiss-done-btn {
  background: none;
  border: none;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
}

/* History Drawer and Overlay */
.history-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

.history-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  background-color: var(--bg-primary);
  border-left: var(--border-width) solid var(--border-color);
  box-shadow: none;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 16px;
  border-bottom: var(--border-width) solid var(--border-color);
  background-color: var(--bg-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-header h2 {
  font-size: 18px;
  font-weight: 900;
  text-transform: uppercase;
}

.drawer-content {
  flex-grow: 1;
  padding: 16px;
  overflow-y: auto;
}

.history-empty {
  text-align: center;
  padding: 40px 0;
  font-weight: 700;
  color: var(--text-muted);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background-color: var(--bg-card);
  border: 2px solid var(--border-color);
  padding: 8px 12px;
}

.history-item-check {
  color: var(--accent-green);
  font-weight: 900;
  font-size: 16px;
}

.history-item-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.history-item-name {
  font-size: 14px;
  font-weight: 700;
  word-break: break-word;
}

.history-item-time {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
}

.drawer-footer {
  padding: 16px;
  border-top: var(--border-width) solid var(--border-color);
  background-color: var(--bg-card);
}

.w-full {
  width: 100%;
}

/* Drawer Transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
