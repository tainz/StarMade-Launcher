<script setup lang="ts">
import { ref } from 'vue';
import UserIcon from '@/components/starmade/icons/UserIcon.vue';
import CogIcon from '@/components/starmade/icons/CogIcon.vue';
import ChevronDownIcon from '@/components/starmade/icons/ChevronDownIcon.vue';
import MinimizeIcon from '@/components/starmade/icons/MinimizeIcon.vue';
import MaximizeIcon from '@/components/starmade/icons/MaximizeIcon.vue';
import CloseIcon from '@/components/starmade/icons/CloseIcon.vue';

// Mock data for now
const activeAccount = ref({
  name: 'TestUser123',
  profiles: { default: { name: 'TestUser123' } },
  selectedProfile: 'default'
});

const isDropdownOpen = ref(false);
const activePage = ref('Play');
</script>

<template>
  <header class="relative z-30 flex justify-between items-center px-6 py-3 bg-black/20 backdrop-blur-sm border-b border-white/5">
    <!-- Left: User Profile + Settings -->
    <div class="flex-1 flex justify-start">
      <div class="flex items-center gap-3">
        <!-- User Profile Dropdown (static for now) -->
        <div class="relative">
          <div 
            @click="isDropdownOpen = !isDropdownOpen"
            class="flex items-center gap-3 cursor-pointer group"
          >
            <div class="w-10 h-10 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
              <UserIcon icon-class="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 class="font-semibold text-white">{{ activeAccount.name }}</h3>
            </div>
            <ChevronDownIcon 
              icon-class="w-4 h-4 text-gray-400 transition-transform"
              :class="{ 'rotate-180': isDropdownOpen }"
            />
          </div>
        </div>
        
        <!-- Settings Button -->
        <button class="p-2 rounded-full hover:bg-white/10 transition-colors">
          <CogIcon icon-class="w-6 h-6 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
    
    <!-- Center: Navigation -->
    <div class="flex-1 flex justify-center">
      <nav class="flex items-center gap-10">
        <button
          v-for="page in ['Play', 'Installations', 'News']"
          :key="page"
          class="font-display uppercase tracking-widest transition-colors duration-200 relative pb-2"
          :class="activePage === page ? 'text-white' : 'text-gray-500 hover:text-gray-300'"
        >
          {{ page }}
          <div 
            v-if="activePage === page"
            class="absolute bottom-0 left-0 w-full h-1 bg-starmade-accent rounded-full shadow-[0_0_8px_0px_#27b866]"
          />
        </button>
      </nav>
    </div>
    
    <!-- Right: Window Controls -->
    <div class="flex-1 flex justify-end">
      <div class="flex items-center gap-2">
        <button class="p-2 rounded-md hover:bg-white/5 transition-colors">
          <MinimizeIcon icon-class="w-5 h-5 text-gray-400" />
        </button>
        <button class="p-2 rounded-md hover:bg-white/5 transition-colors">
          <MaximizeIcon icon-class="w-5 h-5 text-gray-400" />
        </button>
        <button class="p-2 rounded-md hover:bg-starmade-danger/20 transition-colors">
          <CloseIcon icon-class="w-5 h-5 text-gray-400 hover:text-starmade-danger-light" />
        </button>
      </div>
    </div>
  </header>
</template>