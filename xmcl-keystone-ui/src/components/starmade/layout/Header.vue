<template>
  <header 
    class="relative z-30 flex justify-between items-center px-6 py-3 bg-black/20 backdrop-blur-sm border-b border-white/5"
    style="-webkit-app-region: drag;"
  >
    <!-- Left: User Profile -->
    <div class="flex-1 flex justify-start" style="-webkit-app-region: no-drag;">
      <div class="flex items-center gap-3">
        <!-- User Profile Dropdown -->
        <div class="relative" ref="dropdownRef">
          <div 
            @click="toggleDropdown"
            class="flex items-center gap-3 cursor-pointer group"
          >
            <div class="w-10 h-10 bg-slate-800/50 rounded-full flex items-center justify-center group-hover:bg-slate-700/70 transition-colors border border-slate-700">
              <UserIcon class="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 class="font-semibold text-white">{{ displayName }}</h3>
            </div>
            <ChevronDownIcon 
              class="w-4 h-4 text-gray-400 group-hover:text-white transition-all"
              :class="{ 'rotate-180': isDropdownOpen }"
            />
          </div>

          <!-- Dropdown Menu -->
          <div 
            v-if="isDropdownOpen"
            class="absolute top-full mt-2 w-72 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-md shadow-lg overflow-hidden z-20"
          >
            <div class="p-2">
              <p class="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">ACCOUNTS</p>
              <ul>
                <li v-for="account in mockAccounts" :key="account.id">
                  <button
                    @click="selectAccount(account)"
                    class="w-full flex items-center gap-3 px-2 py-2 text-left rounded-md hover:bg-slate-700/50 transition-colors"
                  >
                    <div class="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600">
                      <UserIcon class="w-5 h-5 text-slate-400" />
                    </div>
                    <span class="text-sm text-white flex-1">{{ account.name }}</span>
                    <CheckCircleIcon 
                      v-if="activeAccountId === account.id"
                      class="w-5 h-5 text-starmade-accent" 
                    />
                  </button>
                </li>
              </ul>
            </div>
            
            <hr class="border-slate-700/50" />
            
            <div class="p-2">
              <ul>
                <li>
                  <button
                    class="w-full flex items-center gap-3 px-2 py-2 text-left rounded-md hover:bg-slate-700/50 transition-colors text-sm text-gray-300 hover:text-white"
                  >
                    <CogIcon class="w-5 h-5" />
                    <span>Manage Accounts</span>
                  </button>
                </li>
                <li>
                  <button
                    class="w-full flex items-center gap-3 px-2 py-2 text-left rounded-md hover:bg-slate-700/50 transition-colors text-sm text-gray-300 hover:text-white"
                  >
                    <UserPlusIcon class="w-5 h-5" />
                    <span>Add Account</span>
                  </button>
                </li>
                <li>
                  <button
                    class="w-full flex items-center gap-3 px-2 py-2 text-left rounded-md hover:bg-slate-700/50 transition-colors text-sm text-gray-300 hover:text-white"
                  >
                    <ArrowRightOnRectangleIcon class="w-5 h-5" />
                    <span>Log Out</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Settings Button -->
        <button 
          class="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Settings"
        >
          <CogIcon class="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
        </button>
      </div>
    </div>

    <!-- Center: Navigation -->
    <div class="flex-1 flex justify-center" style="-webkit-app-region: no-drag;">
      <nav class="flex items-center gap-10">
        <button
          v-for="item in navItems"
          :key="item"
          @click="navigateTo(item)"
          class="font-display uppercase tracking-widest transition-colors duration-200 relative pb-2"
          :class="[
            activePage === item 
              ? 'text-white' 
              : 'text-gray-500 hover:text-gray-300'
          ]"
        >
          {{ item }}
          <div 
            v-if="activePage === item"
            class="absolute bottom-0 left-0 w-full h-1 bg-starmade-accent rounded-full shadow-[0_0_8px_0px_#227b86]"
          ></div>
        </button>
      </nav>
    </div>

    <!-- Right: Window Controls -->
    <div class="flex-1 flex justify-end" style="-webkit-app-region: no-drag;">
      <div class="flex items-center gap-2">
        <button 
          @click="minimizeWindow"
          class="p-2 rounded-md hover:bg-white/5 transition-colors"
        >
          <MinimizeIcon class="w-5 h-5 text-gray-400" />
        </button>
        <button 
          @click="maximizeWindow"
          class="p-2 rounded-md hover:bg-white/5 transition-colors"
        >
          <MaximizeIcon class="w-5 h-5 text-gray-400" />
        </button>
        <button 
          @click="closeWindow"
          class="p-2 rounded-md hover:bg-starmade-danger/20 transition-colors"
        >
          <CloseIcon class="w-5 h-5 text-gray-400 hover:text-starmade-danger-light" />
        </button>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import {
  UserIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  CogIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
  MinimizeIcon,
  MaximizeIcon,
  CloseIcon,
} from '../icons'

export default defineComponent({
  name: 'Header',
  components: {
    UserIcon,
    ChevronDownIcon,
    CheckCircleIcon,
    CogIcon,
    UserPlusIcon,
    ArrowRightOnRectangleIcon,
    MinimizeIcon,
    MaximizeIcon,
    CloseIcon,
  },
  setup() {
    const isDropdownOpen = ref(false)
    const dropdownRef = ref<HTMLElement | null>(null)
    const activePage = ref('PLAY')
    const activeAccountId = ref('1')

    const navItems = ['PLAY', 'INSTALLATIONS', 'NEWS']

    const mockAccounts = [
      { id: '1', name: 'DukeofRealms' },
      { id: '2', name: 'Player2' },
    ]

    const displayName = ref('DukeofRealms')

    const toggleDropdown = () => {
      isDropdownOpen.value = !isDropdownOpen.value
    }

    const selectAccount = (account: { id: string; name: string }) => {
      activeAccountId.value = account.id
      displayName.value = account.name
      isDropdownOpen.value = false
    }

    const navigateTo = (page: string) => {
      activePage.value = page
      // TODO: Integrate with Vue Router
    }

    const minimizeWindow = () => {
      // TODO: Electron IPC call
      console.log('Minimize window')
    }

    const maximizeWindow = () => {
      // TODO: Electron IPC call
      console.log('Maximize window')
    }

    const closeWindow = () => {
      // TODO: Electron IPC call
      console.log('Close window')
    }

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
        isDropdownOpen.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      isDropdownOpen,
      dropdownRef,
      activePage,
      activeAccountId,
      navItems,
      mockAccounts,
      displayName,
      toggleDropdown,
      selectAccount,
      navigateTo,
      minimizeWindow,
      maximizeWindow,
      closeWindow,
    }
  },
})
</script>