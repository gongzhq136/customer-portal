<template>
  <div class="flex items-center gap-3">
    <!-- Logo Icon -->
    <div class="relative">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Background circle -->
        <circle cx="20" cy="20" r="20" fill="#75cbfe" />
        <!-- Building/facility icon -->
        <rect x="12" y="15" width="4" height="10" fill="white" rx="1" />
        <rect x="18" y="12" width="4" height="13" fill="white" rx="1" />
        <rect x="24" y="18" width="4" height="7" fill="white" rx="1" />
        <!-- Roof/peak -->
        <path d="M10 15 L20 8 L30 15 L28 15 L20 10 L12 15 Z" fill="white" />
        <!-- Door -->
        <rect x="18" y="20" width="2" height="5" fill="#75cbfe" />
      </svg>
    </div>

    <!-- Company Name -->
    <div class="flex flex-col">
      <span class="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
        ApexPro
      </span>
      <span class="text-sm text-gray-600 dark:text-gray-400 leading-tight -mt-1">
        Facility Services
      </span>
    </div>
  </div>
</template>
