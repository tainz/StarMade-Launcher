<template>
  <div class="h-full flex flex-col">
    <h1 class="font-display text-3xl font-bold uppercase text-white mb-6 tracking-wider flex-shrink-0">
      Steam News Feed
    </h1>

    <!-- News Grid -->
    <div class="flex-grow overflow-y-auto pr-4">
      <div class="grid grid-cols-2 grid-rows-[450px_repeat(2,200px)] gap-4 auto-rows-[200px]">
        <!-- Hero Card (Spans 2 columns, 3 rows) -->
        <div class="col-span-2 row-span-3 h-[450px] bg-black/20 rounded-lg p-3 border border-transparent hover:border-white/10 transition-all cursor-pointer group">
          <div 
            class="w-full h-full rounded-md overflow-hidden relative flex flex-col justify-end p-6 bg-cover bg-center transition-transform group-hover:scale-105"
            :style="{ backgroundImage: `url(${heroNews.imageUrl})` }"
          >
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all"></div>
            <div class="relative z-10 text-white">
              <p class="text-sm font-semibold uppercase tracking-widest text-starmade-text-accent">
                {{ heroNews.category }}
              </p>
              <h2 class="font-display text-4xl font-bold mt-2 mb-3">
                {{ heroNews.title }}
              </h2>
              <p class="text-xs text-gray-300 uppercase tracking-wider">
                {{ heroNews.date }}
              </p>
            </div>
            <div class="absolute top-4 right-4 bg-black/30 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0 translate-x-2">
              <ChevronRightIcon class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <!-- Regular News Cards -->
        <div 
          v-for="item in regularNews" 
          :key="item.id"
          class="bg-black/20 rounded-lg p-3 border border-transparent hover:border-white/10 transition-all cursor-pointer group"
        >
          <div 
            class="w-full h-full rounded-md overflow-hidden relative flex flex-col justify-end p-4 bg-cover bg-center transition-transform group-hover:scale-105"
            :style="{ backgroundImage: `url(${item.imageUrl})` }"
          >
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all"></div>
            <div class="relative z-10 text-white">
              <p class="text-xs font-semibold uppercase tracking-wider text-starmade-text-accent mb-1">
                {{ item.category }}
              </p>
              <h3 class="font-display text-lg font-bold mb-1 line-clamp-2">
                {{ item.title }}
              </h3>
              <p class="text-xs text-gray-300 uppercase tracking-wider">
                {{ item.date }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { ChevronRightIcon } from '@/components/starmade/icons'

interface NewsItem {
  id: number
  title: string
  category: string
  date: string
  imageUrl: string
  isHero?: boolean
}

export default defineComponent({
  name: 'Play',
  components: {
    ChevronRightIcon,
  },
  setup() {
    const newsData: NewsItem[] = [
      {
        id: 1,
        title: 'Universe Reset & New Features Deployed',
        category: 'GAME UPDATES',
        date: 'JUNE 14, 2024',
        imageUrl: 'https://i.imgur.com/biwBbge.png',
        isHero: true,
      },
      {
        id: 2,
        title: 'Mod Spotlight: Resources ReSourced',
        category: 'MODS',
        date: 'JUNE 10, 2024',
        imageUrl: 'https://starmadedock.net/attachments/starmade-screenshot-0073-png.59078/',
      },
      {
        id: 3,
        title: 'Dev Diary: Upcoming Faction System Rework',
        category: 'DEVELOPMENT',
        date: 'JUNE 5, 2024',
        imageUrl: 'https://starmadedock.net/attachments/1-png.64246/',
      },
      {
        id: 4,
        title: 'StarMade Server Hosting Guide',
        category: 'GUIDES',
        date: 'MAY 28, 2024',
        imageUrl: 'https://starmadedock.net/attachments/starmade-screenshot-0001-png.60943/',
      },
    ]

    const heroNews = computed(() => newsData.find(item => item.isHero) || newsData[0])
    const regularNews = computed(() => newsData.filter(item => !item.isHero))

    return {
      heroNews,
      regularNews,
    }
  },
})
</script>