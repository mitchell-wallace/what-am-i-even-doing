<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

// --- State Definitions ---
const tasks = ref([])
const activeTaskId = ref(null)
const lastDoneTask = ref(null)
const shouldLastDoneShake = ref(false)
const history = ref([])
const isDottedLineReversed = ref(false)
const isDottedLineClicked = ref(false)

const originalWords = ["What", "am", "I", "even", "doing?"]
const pools = [
  ["What", "Why", "Where", "How", "Who", "When"],
  ["am", "was", "are", "be", "is"],
  ["I", "we", "you", "they", "one", "everyone"],
  ["even", "actually", "really", "literally", "honestly", "currently"],
  ["doing?", "debugging?", "designing?", "developing?", "dreaming?", "destroying?", "deciding?", "deploying?", "drawing?", "dancing?", "drinking?", "making?"]
]
const taglineWords = ref([...originalWords])

const editingTaglineIdx = ref(null)
const editingTaglineValue = ref('')
const taglineInputRef = ref(null)

const clickTimeout = ref(null)
const clickTimeoutIdx = ref(null)

const logoLetters = computed(() => {
  return taglineWords.value.map(word => {
    if (!word) return ''
    return word[0].toUpperCase()
  })
})

// Keep track of active flash timeouts and original words before flash
const activeFlashes = ref({}) // idx -> timer
const originalSaved = {} // idx -> original word
const taglineWordStates = ref([
  { flashing: false, clicked: false },
  { flashing: false, clicked: false },
  { flashing: false, clicked: false },
  { flashing: false, clicked: false },
  { flashing: false, clicked: false }
])

let resetTimer = null

function resetTaglineWords() {
  // Clear any active flashes
  Object.keys(activeFlashes.value).forEach(idx => {
    clearTimeout(activeFlashes.value[idx])
    taglineWordStates.value[idx].flashing = false
  })
  activeFlashes.value = {}
  
  // Clear editing state
  editingTaglineIdx.value = null
  editingTaglineValue.value = ''
  
  // Set back to original words
  taglineWords.value = [...originalWords]
}

function startResetTimer() {
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    resetTaglineWords()
    resetTimer = null
  }, 10000)
}

function flashWord(idx) {
  // If already flashing, clear timer first
  if (activeFlashes.value[idx]) {
    clearTimeout(activeFlashes.value[idx])
  } else {
    originalSaved[idx] = taglineWords.value[idx]
  }

  const pool = pools[idx]
  const currentWord = taglineWords.value[idx]
  const otherWords = pool.filter(w => w !== currentWord)
  const substitute = otherWords[Math.floor(Math.random() * otherWords.length)]

  taglineWords.value[idx] = substitute
  taglineWordStates.value[idx].flashing = true

  activeFlashes.value[idx] = setTimeout(() => {
    if (originalSaved[idx] !== undefined) {
      taglineWords.value[idx] = originalSaved[idx]
      delete originalSaved[idx]
    }
    taglineWordStates.value[idx].flashing = false
    delete activeFlashes.value[idx]
  }, 450)

  startResetTimer()
}

function clickWord(idx) {
  if (clickTimeout.value !== null && clickTimeoutIdx.value === idx) {
    clearTimeout(clickTimeout.value)
    clickTimeout.value = null
    clickTimeoutIdx.value = null
    return
  }
  
  if (clickTimeout.value !== null) {
    clearTimeout(clickTimeout.value)
  }
  
  clickTimeoutIdx.value = idx
  clickTimeout.value = setTimeout(() => {
    clickTimeout.value = null
    clickTimeoutIdx.value = null
    cycleWord(idx)
  }, 220)
}

function cycleWord(idx) {
  // Cancel active flash/hover timer so it doesn't restore to the old word
  if (activeFlashes.value[idx]) {
    clearTimeout(activeFlashes.value[idx])
    delete activeFlashes.value[idx]
    delete originalSaved[idx]
    taglineWordStates.value[idx].flashing = false
  }

  const pool = pools[idx]
  const currentWord = taglineWords.value[idx]
  const otherWords = pool.filter(w => w !== currentWord)
  const substitute = otherWords[Math.floor(Math.random() * otherWords.length)]

  taglineWords.value[idx] = substitute
  
  // Trigger click animation
  taglineWordStates.value[idx].clicked = true
  setTimeout(() => {
    taglineWordStates.value[idx].clicked = false
  }, 500)

  startResetTimer()
}

function startEditingTagline(idx) {
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
  
  if (activeFlashes.value[idx]) {
    clearTimeout(activeFlashes.value[idx])
    delete activeFlashes.value[idx]
    delete originalSaved[idx]
    taglineWordStates.value[idx].flashing = false
  }
  
  editingTaglineIdx.value = idx
  editingTaglineValue.value = taglineWords.value[idx]
  
  nextTick(() => {
    if (taglineInputRef.value && taglineInputRef.value[0]) {
      taglineInputRef.value[0].focus()
      taglineInputRef.value[0].select()
    }
  })
}

function saveTaglineWord(idx) {
  if (editingTaglineIdx.value !== idx) return
  
  const val = editingTaglineValue.value.trim()
  if (val) {
    taglineWords.value[idx] = val
  }
  
  editingTaglineIdx.value = null
  editingTaglineValue.value = ''
  startResetTimer()
}

function cancelEditingTagline() {
  editingTaglineIdx.value = null
  editingTaglineValue.value = ''
  startResetTimer()
}

function toggleDottedLineDirection() {
  isDottedLineReversed.value = !isDottedLineReversed.value
  isDottedLineClicked.value = true
  setTimeout(() => {
    isDottedLineClicked.value = false
  }, 400)
}

onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
  if (clickTimeout.value) clearTimeout(clickTimeout.value)
  Object.keys(activeFlashes.value).forEach(idx => {
    clearTimeout(activeFlashes.value[idx])
  })
})

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

// Capped state watch
const isAttentionCappedJustTriggered = ref(false)
let capTimer = null

watch(() => tasks.value.length, (newLength) => {
  if (newLength >= 5) {
    isAttentionCappedJustTriggered.value = true
    if (capTimer) clearTimeout(capTimer)
    capTimer = setTimeout(() => {
      isAttentionCappedJustTriggered.value = false
    }, 10000)
  } else {
    isAttentionCappedJustTriggered.value = false
    if (capTimer) {
      clearTimeout(capTimer)
      capTimer = null
    }
  }
}, { immediate: true })

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
        { id: '2', name: '🤖 Toggle 🤖/👤 in focus box to mark AI/Human work.', assignee: 'robot' },
        { id: '3', name: '✏️ Double-click this task to edit its name.' },
        { id: '4', name: '↕️ Drag me up or down to reorder the list.' }
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
  tasks.value.push({ id: newId, name, assignee: null })
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

function toggleAssignee(type) {
  const activeTask = tasks.value.find(t => t.id === activeTaskId.value)
  if (!activeTask) return
  
  if (activeTask.assignee === type) {
    activeTask.assignee = null
  } else {
    activeTask.assignee = type
  }
  saveTasks()
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

function undoLastDone() {
  if (!lastDoneTask.value) return
  if (tasks.value.length >= 5) {
    shouldLastDoneShake.value = true
    setTimeout(() => {
      shouldLastDoneShake.value = false
    }, 500)
    return
  }

  const restoredTask = {
    id: lastDoneTask.value.id,
    name: lastDoneTask.value.name,
    assignee: null
  }
  tasks.value.push(restoredTask)
  
  if (tasks.value.length === 1) {
    activeTaskId.value = restoredTask.id
    saveActiveTask()
  }

  history.value = history.value.filter(item => item.id !== lastDoneTask.value.id)
  saveHistory()

  dismissLastDone()
  saveTasks()
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
        <h1 class="logo-text" aria-label="WAIED?">
          <span 
            v-for="(char, idx) in logoLetters" 
            :key="idx + '-' + taglineWords[idx]" 
            class="logo-letter logo-letter-anim"
          >
            {{ char }}
          </span><span class="logo-question">?</span>
        </h1>
        <div class="header-actions">
          <!-- Theme Switcher (Icons Only) -->
          <button 
            class="neo-btn toggle-theme-btn" 
            @click.stop="toggleTheme"
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
            @click.stop="showHistory = !showHistory" 
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
      <p 
        class="tagline" 
        @click.stop
        title="Hover a word to flash it, click to cycle it, or double-click to edit!"
      >
        <template v-for="(word, idx) in taglineWords" :key="idx">
          <span 
            v-if="editingTaglineIdx !== idx"
            class="tagline-word"
            :class="{
              'is-flashing': taglineWordStates[idx].flashing,
              'is-clicked': taglineWordStates[idx].clicked
            }"
            @mouseenter="flashWord(idx)"
            @click.stop="clickWord(idx)"
            @dblclick.stop="startEditingTagline(idx)"
          >
            {{ word }}
          </span>
          <input
            v-else
            ref="taglineInputRef"
            v-model="editingTaglineValue"
            type="text"
            class="edit-tagline-input"
            @blur="saveTaglineWord(idx)"
            @keyup.enter="saveTaglineWord(idx)"
            @keyup.escape="cancelEditingTagline"
            @click.stop
            maxlength="20"
          />
        </template>
      </p>
      
      <!-- Dotted Line Divider -->
      <div 
        class="dotted-line"
        :class="{ 
          'reverse-scroll': isDottedLineReversed,
          'is-clicked': isDottedLineClicked
        }"
        @click.stop="toggleDottedLineDirection"
        title="Click to reverse scroll direction!"
      ></div>
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
          :class="{ 
            'input-capped-fresh': tasks.length >= 5 && isAttentionCappedJustTriggered, 
            'input-capped-dimmed': tasks.length >= 5 && !isAttentionCappedJustTriggered 
          }"
          :placeholder="tasks.length >= 5 ? 'ATTENTION FULL: 5/5' : 'Add a priority...'"
          :disabled="tasks.length >= 5"
          :title="tasks.length >= 5 ? 'Complete or delete before adding more' : 'Type to add a task'"
          maxlength="80"
        />
        <button 
          type="submit" 
          class="neo-btn neo-btn-pink add-btn"
          :disabled="tasks.length >= 5"
          :title="tasks.length >= 5 ? 'Complete or delete before adding more' : 'Add task'"
        >
          +
        </button>
      </form>
    </div>

    <!-- Active Focus Banner -->
    <div v-if="tasks.length > 0" :key="activeTaskId" class="focus-indicator pop-focus">
      <div class="focus-indicator-header">
        <span class="indicator-tag">CURRENT FOCUS</span>
        <!-- Assignee Toggles -->
        <div class="focus-assignee-toggles">
          <button 
            class="assignee-toggle-btn"
            :class="{ 'active-human': tasks.find(t => t.id === activeTaskId)?.assignee === 'human' }"
            @click.stop="toggleAssignee('human')"
            title="Mark as Human task"
            aria-label="Mark as Human task"
          >
            <!-- Human SVG -->
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter">
              <rect x="9" y="4" width="6" height="6" fill="currentColor" fill-opacity="0.1" />
              <line x1="12" y1="10" x2="12" y2="13" />
              <path d="M5 18c0-3 2-5 5-5h4c3 0 5 2 5 5" />
            </svg>
          </button>
          <button 
            class="assignee-toggle-btn"
            :class="{ 'active-robot': tasks.find(t => t.id === activeTaskId)?.assignee === 'robot' }"
            @click.stop="toggleAssignee('robot')"
            title="Mark as AI Robot task"
            aria-label="Mark as AI Robot task"
          >
            <!-- Robot SVG -->
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter">
              <rect x="6" y="6" width="12" height="12" fill="currentColor" fill-opacity="0.1" />
              <rect x="9" y="10" width="1.5" height="1.5" fill="currentColor" />
              <rect x="13.5" y="10" width="1.5" height="1.5" fill="currentColor" />
              <line x1="10" y1="14" x2="14" y2="14" />
              <line x1="12" y1="6" x2="12" y2="3" />
              <circle cx="12" cy="2" r="1" fill="currentColor" />
              <rect x="4" y="10" width="2" height="4" />
              <rect x="18" y="10" width="2" height="4" />
            </svg>
          </button>
        </div>
      </div>
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

      <TransitionGroup 
        v-else 
        name="list" 
        tag="div" 
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

          <!-- Assignee Badge -->
          <Transition name="badge">
            <div v-if="task.assignee" class="task-assignee-badge" :class="`badge-${task.assignee}`" :title="`Assigned to: ${task.assignee}`">
              <!-- Human Badge Icon -->
              <svg v-if="task.assignee === 'human'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter">
                <rect x="9" y="4" width="6" height="6" fill="currentColor" fill-opacity="0.1" />
                <line x1="12" y1="10" x2="12" y2="13" />
                <path d="M5 18c0-3 2-5 5-5h4c3 0 5 2 5 5" />
              </svg>
              <!-- Robot Badge Icon -->
              <svg v-else-if="task.assignee === 'robot'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter">
                <rect x="6" y="6" width="12" height="12" fill="currentColor" fill-opacity="0.1" />
                <rect x="9" y="10" width="1.5" height="1.5" fill="currentColor" />
                <rect x="13.5" y="10" width="1.5" height="1.5" fill="currentColor" />
                <line x1="10" y1="14" x2="14" y2="14" />
                <line x1="12" y1="6" x2="12" y2="3" />
                <circle cx="12" cy="2" r="1" fill="currentColor" />
                <rect x="4" y="10" width="2" height="4" />
                <rect x="18" y="10" width="2" height="4" />
              </svg>
            </div>
          </Transition>

          <!-- Delete Button (Only displays on hover/edit) -->
          <button 
            class="delete-btn" 
            @click.stop="removeTask(task.id)"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </main>

    <!-- Most Recently Done Banner -->
    <footer class="app-footer">
      <div 
        v-if="lastDoneTask" 
        class="last-done-banner neo-card pop-entry"
        :class="{ 'shake-banner': shouldLastDoneShake }"
      >
        <div class="last-done-info">
          <span class="done-badge">DONE</span>
          <span class="last-done-text">{{ lastDoneTask.name }}</span>
        </div>
        <div class="last-done-actions">
          <button class="undo-done-btn" @click="undoLastDone" title="Undo completed task">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button class="dismiss-done-btn" @click="dismissLastDone" title="Dismiss">
            ✕
          </button>
        </div>
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
              <div class="history-item-check">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="4">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div class="history-item-details">
                <span class="history-item-name">{{ item.name }}</span>
              </div>
              <div class="history-item-meta">
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
  padding-bottom: 0px;
  cursor: default;
}

.dotted-line {
  position: relative; /* Create relative context for hitbox */
  height: 2px;
  background-image: linear-gradient(to right, var(--border-color) 60%, transparent 40%);
  background-position: bottom;
  background-size: 12px 2px;
  background-repeat: repeat-x;
  cursor: pointer;
  margin-top: 14px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Invisible hitbox extending slightly above and below the line */
.dotted-line::before {
  content: '';
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: 0;
  right: 0;
  cursor: pointer;
  z-index: 5;
}

.dotted-line:hover {
  animation: scroll-border-right 0.6s linear infinite;
}

.dotted-line.reverse-scroll:hover {
  animation: scroll-border-left 0.6s linear infinite;
}

.dotted-line.is-clicked {
  animation: line-click-pulse 0.4s ease-out;
}

@keyframes line-click-pulse {
  0% { transform: scaleY(1); }
  50% { transform: scaleY(3); opacity: 0.8; }
  100% { transform: scaleY(1); }
}

@keyframes scroll-border-right {
  from { background-position: 0 100%; }
  to { background-position: 12px 100%; }
}

@keyframes scroll-border-left {
  from { background-position: 0 100%; }
  to { background-position: -12px 100%; }
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
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.logo-letter {
  display: inline-block;
  backface-visibility: hidden;
}

.logo-letter-anim {
  animation: logo-flip-in 0.35s cubic-bezier(0.34, 1.8, 0.64, 1) forwards;
  transform-origin: bottom center;
}

@keyframes logo-flip-in {
  0% {
    opacity: 0;
    transform: translateY(8px) rotateX(-90deg) scale(0.6);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotateX(0deg) scale(1);
  }
}

.logo-question {
  display: inline-block;
  cursor: pointer;
  transition: transform 0.5s cubic-bezier(0.34, 2, 0.64, 1);
}

.logo-text:hover .logo-question,
.logo-question:hover {
  transform: scaleX(-1) rotate(-15deg) scale(1.2);
}

.tagline {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 4px;
  cursor: default;
  user-select: none;
  display: inline-flex;
  gap: 4px;
}

.edit-tagline-input {
  font-family: var(--font-main);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-main);
  background-color: var(--bg-card);
  border: 1.5px solid var(--border-color);
  padding: 1px 4px;
  width: 75px;
  outline: none;
  box-shadow: 1px 1px 0px 0px var(--shadow-color);
  margin-top: -2px;
}

.tagline-word {
  display: inline-block;
  cursor: pointer;
  transition: color 0.15s ease, transform 0.15s ease;
}

.tagline-word:hover {
  color: var(--accent-pink);
  transform: translateY(-2px) scale(1.05);
}

.tagline-word.is-flashing {
  animation: word-flash-anim 0.45s ease-in-out;
  color: var(--accent-pink);
}

@keyframes word-flash-anim {
  0% { transform: scale(1); }
  50% { transform: scale(1.15) rotate(3deg); }
  100% { transform: scale(1); }
}

.tagline-word.is-clicked {
  animation: word-click-anim 0.5s cubic-bezier(0.34, 1.75, 0.64, 1);
}

@keyframes word-click-anim {
  0% { transform: scale(1); }
  30% { transform: scale(1.3) rotate(-10deg); color: var(--accent-active); }
  100% { transform: scale(1) rotate(0deg); }
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

.neo-input {
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), 
              box-shadow 0.15s ease, 
              background-color 0.2s ease, 
              border-color 0.2s ease, 
              color 0.2s ease;
}

.neo-input:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: var(--shadow-main);
}

.neo-input:focus:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-main);
}

.neo-input.input-capped-fresh {
  background-color: var(--accent-orange) !important;
  color: #000000 !important;
  border-color: var(--border-color) !important;
  box-shadow: var(--shadow-main) !important;
  text-align: center;
  font-weight: 900;
  letter-spacing: 0.5px;
  animation: warning-pulse 0.5s ease-in-out infinite alternate;
}

.neo-input.input-capped-fresh::placeholder {
  color: #000000 !important;
  opacity: 0.9;
}

.neo-input.input-capped-dimmed {
  background-color: var(--bg-primary) !important;
  color: var(--text-muted) !important;
  border-color: var(--text-muted) !important;
  box-shadow: none !important;
  text-align: center;
  font-weight: 700;
  transition: background-color 1s ease, color 1s ease, border-color 1s ease, box-shadow 1s ease;
}

.neo-input.input-capped-dimmed::placeholder {
  color: var(--text-muted) !important;
  opacity: 0.6;
}

@keyframes warning-pulse {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0.99);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.neo-input:disabled {
  cursor: not-allowed;
}

.neo-input:disabled:hover,
.add-btn:disabled:hover {
  animation: shake 0.3s ease-in-out;
}

.add-btn:disabled {
  background: repeating-linear-gradient(
    -45deg,
    var(--bg-card),
    var(--bg-card) 6px,
    var(--text-muted) 6px,
    var(--text-muted) 8px
  ) !important;
  color: var(--text-muted) !important;
  border-color: var(--text-muted) !important;
  cursor: not-allowed;
  box-shadow: none !important;
  transform: none !important;
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
  font-size: 26px;
  font-weight: 900;
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
  position: relative; /* Essential for TransitionGroup absolute leaves */
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
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
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
  transform: scale(0) rotate(-15deg);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease;
}

.neo-checkbox-container input:checked ~ .neo-checkmark .check-svg {
  opacity: 1;
  transform: scale(1) rotate(0deg);
  color: #000000;
}

.neo-checkmark {
  height: 24px;
  width: 24px;
  background-color: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  box-shadow: 1px 1px 0px 0px var(--shadow-color);
  transition: background-color 0.1s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, box-shadow 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.neo-checkbox-container:hover .neo-checkmark {
  transform: scale(1.1) translate(-0.5px, -0.5px);
  box-shadow: 1.5px 1.5px 0px 0px var(--shadow-color);
  background-color: var(--bg-primary);
}

.neo-checkbox-container input:checked ~ .neo-checkmark {
  background-color: var(--accent-green);
  box-shadow: none;
  transform: translate(1px, 1px) scale(0.95);
}

.neo-checkbox-container input:checked:hover ~ .neo-checkmark {
  transform: translate(1px, 1px) scale(1);
  box-shadow: none;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  margin-left: 0;
  opacity: 0;
  color: var(--text-main);
  transition: opacity 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), 
              transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), 
              width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), 
              margin-left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              padding 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  width: 0;
  overflow: hidden;
  transform: scale(0) rotate(-45deg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-item:hover .delete-btn {
  opacity: 0.8;
  width: 24px;
  margin-left: 8px;
  padding: 4px 8px;
  transform: scale(1) rotate(0deg);
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
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.last-done-banner:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px 0px var(--shadow-color);
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

.shake-banner {
  animation: shake 0.3s ease-in-out !important;
}

.last-done-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.undo-done-btn,
.dismiss-done-btn {
  background: none;
  border: none;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transform: scale(0) rotate(-45deg);
  transition: opacity 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), 
              transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: inherit;
}

.undo-done-btn svg {
  display: block;
}

.last-done-banner:hover .undo-done-btn,
.last-done-banner:hover .dismiss-done-btn {
  opacity: 0.8;
  transform: scale(1) rotate(0deg);
}

.undo-done-btn:hover {
  color: #ffcc00 !important;
  opacity: 1 !important;
  transform: scale(1.25) rotate(-45deg) !important;
}

.dismiss-done-btn:hover {
  color: #ffcc00 !important;
  opacity: 1 !important;
  transform: scale(1.25) rotate(90deg) !important;
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
  align-items: center;
  gap: 12px;
  background-color: var(--bg-card);
  border: 2.5px solid var(--border-color);
  box-shadow: 2px 2px 0px 0px var(--shadow-color);
  padding: 10px 14px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
}

.history-item:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px 0px var(--accent-green);
  border-color: var(--accent-green);
}

.history-item-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background-color: var(--accent-green);
  color: var(--text-on-accent);
  border: 2px solid var(--border-color);
  box-shadow: 1px 1px 0px 0px var(--shadow-color);
  flex-shrink: 0;
}

.history-item-check svg {
  color: #000000;
}

/* Ensure check icon color handles dark mode theme overrides appropriately */
.dark-theme .history-item-check svg {
  color: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light-theme) .history-item-check svg {
    color: #ffffff;
  }
}

.history-item-details {
  flex-grow: 1;
  min-width: 0;
}

.history-item-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  word-break: break-word;
}

.history-item-meta {
  margin-left: auto;
  flex-shrink: 0;
}

.history-item-time {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  background-color: var(--bg-primary);
  color: var(--text-main);
  border: 1.5px solid var(--border-color);
  padding: 2px 6px;
  box-shadow: 1px 1px 0px 0px var(--shadow-color);
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

/* Assignee Toggles styles */
.focus-indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.focus-assignee-toggles {
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: scale(0.6) rotate(10deg);
  pointer-events: none; /* Disable clicks when hidden */
  transition: opacity 0.25s cubic-bezier(0.34, 1.75, 0.64, 1), 
              transform 0.25s cubic-bezier(0.34, 1.75, 0.64, 1);
}

.focus-indicator:hover .focus-assignee-toggles {
  opacity: 1;
  transform: scale(1) rotate(0deg);
  pointer-events: auto; /* Enable clicks when visible */
}

.assignee-toggle-btn {
  background-color: var(--bg-card);
  color: var(--text-main);
  border: 2px solid var(--border-color);
  box-shadow: 1.5px 1.5px 0px 0px var(--shadow-color);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), 
              box-shadow 0.2s ease, 
              background-color 0.15s ease;
}

.assignee-toggle-btn:hover {
  transform: translate(-2px, -2px) scale(1.1);
  box-shadow: 2px 2px 0px 0px var(--shadow-color);
}

.assignee-toggle-btn:active {
  transform: translate(1px, 1px) scale(0.95);
  box-shadow: 0.5px 0.5px 0px 0px var(--shadow-color);
}

/* Active states */
.assignee-toggle-btn.active-human {
  background-color: var(--accent-orange);
  color: var(--text-on-accent);
  box-shadow: none;
  transform: translate(1px, 1px);
}

.assignee-toggle-btn.active-robot {
  background-color: var(--accent-blue);
  color: #ffffff;
  box-shadow: none;
  transform: translate(1px, 1px);
}

/* Task assignee badges */
.task-assignee-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 2px solid var(--border-color);
  box-shadow: 1.5px 1.5px 0px 0px var(--shadow-color);
  margin-left: auto; /* Push badge to the right edge */
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), 
              box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              background-color 0.2s ease,
              color 0.2s ease;
}

.task-item:hover .task-assignee-badge {
  transform: scale(1.15) rotate(-8deg);
  box-shadow: 2.5px 2.5px 0px 0px var(--shadow-color);
}

.task-assignee-badge.badge-human {
  background-color: var(--accent-orange);
  color: var(--text-on-accent);
}

.task-assignee-badge.badge-robot {
  background-color: var(--accent-blue);
  color: #ffffff;
}

/* Ensure active-task styling handles color overrides inside the items gracefully */
.task-item.active-task .assignee-toggle-btn {
  border-color: #000000;
  box-shadow: 1px 1px 0px 0px #000000;
}

/* Transitions for Task List & Badges */
.list-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.7, 0.64, 1);
}
.list-leave-active {
  transition: all 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  position: absolute;
  width: 100%;
  z-index: 1;
}
.list-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px) rotate(-2deg);
}
.list-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-20px) rotate(2deg);
}
.list-move {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Badge pop transition */
.badge-enter-active {
  animation: badge-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.badge-leave-active {
  animation: badge-pop 0.2s reverse ease-in;
}
@keyframes badge-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Snappy entrance when changing active focus task */
.pop-focus {
  animation: focus-snap 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes focus-snap {
  0% {
    transform: scale(0.92) translateY(4px);
    box-shadow: 0px 0px 0px 0px var(--shadow-color);
  }
  50% {
    transform: scale(1.03) translateY(-2px);
    box-shadow: 6px 6px 0px 0px var(--shadow-color);
  }
  100% {
    transform: scale(1) translateY(0);
    box-shadow: 2px 2px 0px 0px var(--shadow-color);
  }
}

/* Snappy pop-entry for done banner */
.pop-entry {
  animation: spring-entry 0.35s cubic-bezier(0.34, 1.75, 0.64, 1) forwards;
}
@keyframes spring-entry {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(15px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Snappy pop animations on other elements */
.neo-btn {
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.toggle-theme-btn svg,
.toggle-history-btn svg {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toggle-theme-btn:hover svg,
.toggle-history-btn:hover svg {
  transform: scale(1.15) rotate(8deg);
}
.toggle-theme-btn:active svg,
.toggle-history-btn:active svg {
  transform: scale(0.9) rotate(-8deg);
}
</style>
