<script setup lang="ts">
interface Props {
  iconClass?: string;
}
withDefaults(defineProps<Props>(), { iconClass: 'w-5 h-5' });
</script>

<template>
  <svg 
    :class="iconClass"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 19h12v2H6z"/>
  </svg>
</template>
