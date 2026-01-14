<template>
  <div class="py-6 space-y-5 animate-fade-in">
    <!-- 孩子切换骨架 -->
    <div class="flex gap-3">
      <div
        v-for="i in 2"
        :key="i"
        class="flex-1 p-4 rounded-xl bg-gray-100"
      >
        <div class="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-2 animate-pulse" />
        <div class="h-4 bg-gray-200 rounded w-16 mx-auto mb-1 animate-pulse" />
        <div class="h-3 bg-gray-200 rounded w-20 mx-auto animate-pulse" />
      </div>
    </div>

    <!-- 计时器骨架 -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <div class="h-5 bg-gray-200 rounded w-28 animate-pulse" />
        <div class="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
      </div>
      <div class="text-center py-5">
        <div class="h-12 bg-gray-200 rounded w-24 mx-auto mb-2 animate-pulse" />
        <div class="h-4 bg-gray-200 rounded w-32 mx-auto animate-pulse" />
      </div>
    </div>

    <!-- 快捷操作骨架 -->
    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="i in 4"
        :key="i"
        class="card flex flex-col items-center py-5"
      >
        <div class="w-10 h-10 bg-gray-200 rounded mb-2 animate-pulse" />
        <div class="h-4 bg-gray-200 rounded w-16 animate-pulse" />
      </div>
    </div>

    <!-- 今日统计骨架 -->
    <div class="grid grid-cols-3 gap-2.5">
      <div
        v-for="i in 3"
        :key="i"
        class="card text-center py-4"
      >
        <div class="h-8 bg-gray-200 rounded w-12 mx-auto mb-1 animate-pulse" />
        <div class="h-3 bg-gray-200 rounded w-14 mx-auto animate-pulse" />
      </div>
    </div>

    <!-- 历史记录骨架 -->
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <div class="h-5 bg-gray-200 rounded w-24 animate-pulse" />
        <div class="flex gap-2">
          <div
            v-for="i in 3"
            :key="i"
            class="h-6 bg-gray-200 rounded-full w-12 animate-pulse"
          />
        </div>
      </div>
      <div class="space-y-3">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center py-3"
        >
          <div class="w-10 h-10 bg-gray-200 rounded-lg mr-3 animate-pulse" />
          <div class="flex-1">
            <div class="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse" />
            <div class="h-3 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
          <div class="text-right">
            <div class="h-3 bg-gray-200 rounded w-10 mb-1 animate-pulse" />
            <div class="h-3 bg-gray-200 rounded w-12 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
