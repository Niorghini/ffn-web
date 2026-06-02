/**
 * useVirtualizer —— 自实现虚拟滚动（PRD 7.2 要求）
 * - 仅渲染可视区 + overscan 内的行
 * - 用 ResizeObserver 追踪容器高度
 * - 1w 行 < 50ms 渲染
 */
import { useEffect, useRef, useState, useMemo } from 'react'

export const useVirtualizer = ({ count, rowHeight, overscan = 5 }) => {
  const containerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setViewportHeight(el.clientHeight)
    const onScroll = () => setScrollTop(el.scrollTop)
    const onResize = () => setViewportHeight(el.clientHeight)
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  const totalHeight = count * rowHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIndex = Math.min(
    count,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan,
  )
  const visible = useMemo(() => {
    const arr = []
    for (let i = startIndex; i < endIndex; i++) {
      arr.push(i)
    }
    return arr
  }, [startIndex, endIndex])

  return {
    containerRef,
    totalHeight,
    visible,
    offsetY: startIndex * rowHeight,
  }
}
