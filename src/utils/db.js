/**
 * IndexedDB 封装
 * 提供 memo 数据存储的 CRUD 操作，支持分页查询
 */

const DB_NAME = 'ffn_db'
const DB_VERSION = 1
const STORE_NAME = 'memos'

let dbInstance = null

// 打开数据库
const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
  })
}

// 生成唯一 ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 解析标签：#标签名
export const parseTags = (content) => {
  const tagRegex = /#[\w一-龥-]+/g
  return content.match(tagRegex) || []
}

// 获取所有 memos（支持分页）
export const getAllMemos = async (options = {}) => {
  const db = await openDB()
  const { offset = 0, limit = 100 } = options

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('createdAt')
    const memos = []
    let skipped = 0

    const request = index.openCursor(null, 'prev')

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        if (skipped < offset) {
          skipped++
          cursor.continue()
        } else if (memos.length < limit) {
          memos.push(cursor.value)
          cursor.continue()
        } else {
          resolve(memos)
        }
      } else {
        resolve(memos)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// 获取 memos 总数
export const getMemosCount = async () => {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// 获取符合条件的所有 memos（用于搜索、标签筛选，不分页但限制结果数）
export const getFilteredMemos = async (filterFn, options = {}) => {
  const db = await openDB()
  const { limit = 500 } = options

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const memos = []
    let count = 0

    const request = store.openCursor(null, 'prev')

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor && count < limit) {
        if (filterFn(cursor.value)) {
          memos.push(cursor.value)
          count++
        }
        cursor.continue()
      } else {
        resolve(memos)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// 创建新 memo
export const createMemo = async (content, images = []) => {
  const db = await openDB()
  const now = new Date().toISOString()

  const newMemo = {
    id: generateId(),
    content,
    tags: parseTags(content),
    images,
    status: 'unprocessed',
    processedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(newMemo)

    request.onsuccess = () => resolve(newMemo)
    request.onerror = () => reject(request.error)
  })
}

// 更新 memo（保留图片）
export const updateMemo = async (id, content, images = undefined) => {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const memo = getRequest.result
      if (!memo) {
        resolve(null)
        return
      }

      memo.content = content
      memo.tags = parseTags(content)
      memo.updatedAt = new Date().toISOString()

      const putRequest = store.put(memo)
      putRequest.onsuccess = () => resolve(memo)
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// 添加图片到 memo
export const addImagesToMemo = async (id, newImages) => {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const memo = getRequest.result
      if (!memo) {
        resolve(null)
        return
      }

      const existing = memo.images || []
      memo.images = [...existing, ...newImages].slice(0, 9) // 最多 9 张
      memo.updatedAt = new Date().toISOString()

      const putRequest = store.put(memo)
      putRequest.onsuccess = () => resolve(memo)
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// 删除图片从 memo
export const removeImageFromMemo = async (id, imageIndex) => {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const memo = getRequest.result
      if (!memo) {
        resolve(null)
        return
      }

      memo.images = (memo.images || []).filter((_, i) => i !== imageIndex)
      memo.updatedAt = new Date().toISOString()

      const putRequest = store.put(memo)
      putRequest.onsuccess = () => resolve(memo)
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// 删除 memo
export const deleteMemo = async (id) => {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

// 更新处理状态
export const updateMemoStatus = async (id, status) => {
  const db = await openDB()
  const now = new Date().toISOString()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const memo = getRequest.result
      if (!memo) {
        resolve(null)
        return
      }

      memo.status = status
      memo.processedAt = status === 'processed' ? now : null
      memo.updatedAt = now

      const putRequest = store.put(memo)
      putRequest.onsuccess = () => resolve(memo)
      putRequest.onerror = () => reject(putRequest.error)
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

// 批量更新处理状态
export const batchUpdateMemoStatus = async (ids, status) => {
  const db = await openDB()
  const now = new Date().toISOString()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    let completed = 0
    const results = []

    if (ids.length === 0) {
      resolve([])
      return
    }

    ids.forEach(id => {
      const getRequest = store.get(id)
      getRequest.onsuccess = () => {
        const memo = getRequest.result
        if (memo) {
          memo.status = status
          memo.processedAt = status === 'processed' ? now : null
          memo.updatedAt = now
          const putRequest = store.put(memo)
          putRequest.onsuccess = () => {
            results.push(memo)
            completed++
            if (completed === ids.length) resolve(results)
          }
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          completed++
          if (completed === ids.length) resolve(results)
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  })
}

// 获取处理状态统计
export const getStatusStats = async () => {
  const db = await openDB()
  let processed = 0
  let unprocessed = 0

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        if (cursor.value.status === 'processed') {
          processed++
        } else {
          unprocessed++
        }
        cursor.continue()
      } else {
        resolve({ processed, unprocessed })
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// 获取所有标签（带计数）
export const getAllTags = async () => {
  const db = await openDB()
  const tagMap = {}

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        const createdAt = cursor.value.createdAt
        cursor.value.tags.forEach(tag => {
          if (!tagMap[tag]) {
            tagMap[tag] = { count: 0, lastAt: createdAt }
          }
          tagMap[tag].count++
          if (createdAt > tagMap[tag].lastAt) {
            tagMap[tag].lastAt = createdAt
          }
        })
        cursor.continue()
      } else {
        const tags = Object.entries(tagMap)
          .map(([tag, { count, lastAt }]) => ({ tag, count, lastAt }))
        resolve(tags)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// 搜索 memos
export const searchMemos = async (query) => {
  const lowerQuery = query.toLowerCase()
  return getFilteredMemos(memo =>
    memo.content.toLowerCase().includes(lowerQuery) ||
    memo.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

// 按标签筛选
export const getMemosByTag = async (tag) => {
  return getFilteredMemos(memo => memo.tags.includes(tag))
}

// 按日期筛选
export const getMemosByDate = async (dateStr) => {
  return getFilteredMemos(memo => memo.createdAt.startsWith(dateStr))
}

// 获取热力图数据
export const getHeatmapData = async () => {
  const db = await openDB()
  const data = {}

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        const date = cursor.value.createdAt.split('T')[0]
        data[date] = (data[date] || 0) + 1
        cursor.continue()
      } else {
        resolve(data)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// 获取统计数据
export const getStats = async () => {
  const [total, heatmapData] = await Promise.all([
    getMemosCount(),
    getHeatmapData()
  ])

  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()

  let todayCount = 0
  let thisMonthCount = 0

  Object.entries(heatmapData).forEach(([date, count]) => {
    if (date === today) todayCount = count
    const d = new Date(date)
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      thisMonthCount += count
    }
  })

  return { total, today: todayCount, thisMonth: thisMonthCount }
}

// 获取存储使用情况（字节）
export const getStorageEstimate = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota * 100).toFixed(2) : 0
    }
  }
  return { used: 0, quota: 0, percentage: 0 }
}

// 导出所有数据（用于备份）
export const exportAllMemos = async () => {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const memos = []
    const request = store.openCursor(null, 'prev')

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        memos.push(cursor.value)
        cursor.continue()
      } else {
        resolve(memos)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// 导入数据（覆盖模式）
export const importMemos = async (memos) => {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // 清空现有数据
    store.clear()

    let completed = 0
    if (memos.length === 0) {
      resolve(0)
      return
    }

    memos.forEach(memo => {
      const request = store.add(memo)
      request.onsuccess = () => {
        completed++
        if (completed === memos.length) {
          resolve(memos.length)
        }
      }
      request.onerror = () => reject(request.error)
    })
  })
}