<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'
import { sub } from 'date-fns'

const { t } = useI18n()

// Fake data for ApexPro dashboard
const dashboardData = ref({
  overview: {
    totalOrders: 47,
    completedOrders: 42,
    pendingOrders: 5,
    totalInvoices: 23,
    paidInvoices: 21,
    overdueInvoices: 2
  },
  monthlyStats: {
    ordersCompleted: [12, 15, 18, 14, 16, 20, 18],
    serviceRequests: [8, 12, 10, 15, 13, 17, 14],
    slaCompliance: [95, 97, 94, 96, 98, 99, 97]
  },
  recentActivity: [
    {
      id: 1,
      type: 'order',
      title: 'Office Cleaning - Floor 3',
      status: 'completed',
      date: '2024-01-15',
      time: '14:30'
    },
    {
      id: 2,
      type: 'invoice',
      title: 'Monthly Service Invoice #INV-2024-001',
      status: 'paid',
      date: '2024-01-14',
      time: '09:15'
    },
    {
      id: 3,
      type: 'request',
      title: 'HVAC Maintenance Request',
      status: 'in-progress',
      date: '2024-01-13',
      time: '16:45'
    },
    {
      id: 4,
      type: 'order',
      title: 'Window Cleaning - Building A',
      status: 'scheduled',
      date: '2024-01-12',
      time: '11:20'
    }
  ],
  slaMetrics: {
    responseTime: 2.3,
    resolutionTime: 4.7,
    customerSatisfaction: 4.8,
    complianceRate: 97.2
  }
})

// Chart data for visualizations
const _ordersChartData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  datasets: [
    {
      label: 'Orders Completed',
      data: dashboardData.value.monthlyStats.ordersCompleted,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2
    }
  ]
}))

const _slaChartData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  datasets: [
    {
      label: 'SLA Compliance %',
      data: dashboardData.value.monthlyStats.slaCompliance,
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 2
    }
  ]
}))

// Status colors for activity items
const getStatusColor = (status: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  const colors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
    'completed': 'success',
    'paid': 'primary',
    'in-progress': 'info',
    'scheduled': 'warning',
    'overdue': 'error'
  }
  return colors[status] || 'neutral'
}

const getStatusIcon = (type: string, status: string) => {
  if (type === 'order') {
    return status === 'completed' ? 'i-lucide-check-circle' : 'i-lucide-clock'
  }
  if (type === 'invoice') {
    return status === 'paid' ? 'i-lucide-receipt' : 'i-lucide-alert-circle'
  }
  if (type === 'request') {
    return 'i-lucide-life-buoy'
  }
  return 'i-lucide-circle'
}

// Try to use service request widget composable (will be undefined if layer not present)
const serviceRequestWidget = useServiceRequestWidget?.() || null

// Page metadata
useSeoMeta({
  title: $t('dashboard.seo.title'),
  description: $t('dashboard.seo.description')
})
const { isNotificationsSlideoverOpen } = useDashboard()

const items = [[{
  label: 'New mail',
  icon: 'i-lucide-send',
  to: '/inbox'
}, {
  label: 'New customer',
  icon: 'i-lucide-user-plus',
  to: '/customers'
}]] satisfies DropdownMenuItem[][]

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')
</script>

<template>
  <UDashboardPanel
    id="dashboard"
    class="lg:pb-8 min-h-0 overflow-hidden"
    style="height: calc(100dvh - var(--ui-header-height));"
    :ui="{ body: 'flex flex-col flex-1 min-h-0 overflow-y-auto p-4 sm:p-6' }"
  >
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }">
        <template #leading>
          <UIcon name="i-lucide-layout-dashboard" class="size-6 shrink-0" />
          <span class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('dashboard.title') }}
          </span>
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton color="neutral" variant="ghost" square @click="isNotificationsSlideoverOpen = true">
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <HomeDateRangePicker v-model="range" class="-ms-1" />

          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Orders Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ $t('dashboard.cards.totalOrders') }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.overview.totalOrders }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UIcon name="i-lucide-clipboard-check" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center text-sm">
              <span class="text-green-600 dark:text-green-400 font-medium">
                {{ dashboardData.overview.completedOrders }} {{ $t('dashboard.cards.completed') }}
              </span>
              <span class="text-gray-500 dark:text-gray-400 mx-2">•</span>
              <span class="text-yellow-600 dark:text-yellow-400">
                {{ dashboardData.overview.pendingOrders }} {{ $t('dashboard.cards.pending') }}
              </span>
            </div>
          </div>
        </UCard>

        <!-- Invoices Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ $t('dashboard.cards.invoices') }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.overview.totalInvoices }}
              </p>
            </div>
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UIcon name="i-lucide-receipt-text" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center text-sm">
              <span class="text-green-600 dark:text-green-400 font-medium">
                {{ dashboardData.overview.paidInvoices }} {{ $t('dashboard.cards.paid') }}
              </span>
              <span class="text-gray-500 dark:text-gray-400 mx-2">•</span>
              <span class="text-red-600 dark:text-red-400">
                {{ dashboardData.overview.overdueInvoices }} {{ $t('dashboard.cards.overdue') }}
              </span>
            </div>
          </div>
        </UCard>

        <!-- SLA Compliance Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ $t('dashboard.cards.slaCompliance') }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.complianceRate }}%
              </p>
            </div>
            <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UIcon name="i-lucide-gauge" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div class="mt-4">
            <UProgress :model-value="dashboardData.slaMetrics.complianceRate" color="success" />
          </div>
        </UCard>

        <!-- Customer Satisfaction Card -->
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                {{ $t('dashboard.cards.satisfaction') }}
              </p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.customerSatisfaction }}/5
              </p>
            </div>
            <div class="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <UIcon name="i-lucide-star" class="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div class="mt-4">
            <div class="flex items-center">
              <div class="flex text-yellow-400">
                <UIcon v-for="i in 5" :key="i"
                  :name="i <= Math.floor(dashboardData.slaMetrics.customerSatisfaction) ? 'i-lucide-star' : 'i-lucide-star'"
                  :class="i <= Math.floor(dashboardData.slaMetrics.customerSatisfaction) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'" />
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Orders Chart -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t('dashboard.charts.ordersCompleted') }}
              </h3>
              <UButton size="sm" variant="ghost" icon="i-lucide-download">
                {{ $t('dashboard.buttons.export') }}
              </UButton>
            </div>
          </template>
          <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="text-center">
              <UIcon name="i-lucide-bar-chart-3" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500 dark:text-gray-400">
                {{ $t('dashboard.charts.chartPlaceholder') }}
              </p>
              <p class="text-sm text-gray-400 mt-2">
                {{ $t('dashboard.charts.integrationNote') }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- SLA Performance Chart -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t('dashboard.charts.slaPerformance') }}
              </h3>
              <UButton size="sm" variant="ghost" icon="i-lucide-download">
                {{ $t('dashboard.buttons.export') }}
              </UButton>
            </div>
          </template>
          <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="text-center">
              <UIcon name="i-lucide-trending-up" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500 dark:text-gray-400">
                {{ $t('dashboard.charts.slaChartPlaceholder') }}
              </p>
              <p class="text-sm text-gray-400 mt-2">
                {{ $t('dashboard.charts.integrationNote') }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Service Requests Widget (only if layer is present) -->
      <UCard v-if="serviceRequestWidget" class="mb-8">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-bold">Recent Service Requests</h2>
            <NuxtLink to="/requests">
              <UButton variant="ghost" size="xs">View All</UButton>
            </NuxtLink>
          </div>
        </template>

        <RecentServiceRequestsWidget />
      </UCard>

      <!-- Recent Activity and Quick Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Activity -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ $t('dashboard.activity.recentActivity') }}
                </h3>
                <UButton size="sm" variant="ghost" to="/activity">
                  {{ $t('dashboard.buttons.viewAll') }}
                </UButton>
              </div>
            </template>
            <div class="space-y-4">
              <div v-for="activity in dashboardData.recentActivity" :key="activity.id"
                class="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div class="shrink-0">
                  <UAvatar :icon="getStatusIcon(activity.type, activity.status)"
                    :color="getStatusColor(activity.status)" size="sm" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ activity.title }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ activity.date }} at {{ activity.time }}
                  </p>
                </div>
                <div class="shrink-0">
                  <UBadge :color="getStatusColor(activity.status)" variant="subtle">
                    {{ activity.status }}
                  </UBadge>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Quick Stats -->
        <div class="space-y-6">
          <!-- Response Time -->
          <UCard>
            <div class="text-center">
              <UIcon name="i-lucide-clock" class="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.responseTime }}h
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('dashboard.stats.avgResponseTime') }}
              </p>
            </div>
          </UCard>

          <!-- Resolution Time -->
          <UCard>
            <div class="text-center">
              <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ dashboardData.slaMetrics.resolutionTime }}h
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('dashboard.stats.avgResolutionTime') }}
              </p>
            </div>
          </UCard>

          <!-- Quick Actions -->
          <UCard>
            <template #header>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ $t('dashboard.stats.quickActions') }}
              </h4>
            </template>
            <div class="space-y-3">
              <UButton to="/orders/new" color="primary" variant="outline" block icon="i-lucide-plus">
                {{ $t('dashboard.buttons.newOrder') }}
              </UButton>
              <UButton to="/requests/new" color="neutral" variant="outline" block icon="i-lucide-life-buoy">
                {{ $t('dashboard.buttons.newRequest') }}
              </UButton>
              <UButton to="/reports" color="neutral" variant="outline" block icon="i-lucide-file-text">
                {{ $t('dashboard.buttons.generateReport') }}
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
