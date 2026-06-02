/**
 * StatusFilter 组件测试
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatusFilter from '@/components/StatusFilter'

describe('StatusFilter', () => {
  it('三个 tab + 当前选中', () => {
    const onChange = vi.fn()
    render(<StatusFilter value="all" onChange={onChange} />)
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('未处理')).toBeInTheDocument()
    expect(screen.getByText('已处理')).toBeInTheDocument()
  })

  it('点击切换', async () => {
    const onChange = vi.fn()
    render(<StatusFilter value="all" onChange={onChange} />)
    await userEvent.setup().click(screen.getByText('未处理'))
    expect(onChange).toHaveBeenCalledWith('pending')
  })
})
