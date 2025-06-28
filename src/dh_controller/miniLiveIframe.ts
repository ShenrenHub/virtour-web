import { ref, onMounted, onUnmounted } from 'vue'

export function useMiniLiveIframe() {
  const iframeSrc = ref('/dhlive/MiniLive.html')
  const iframeContainer = ref<HTMLIFrameElement | null>(null)
  const iframeWidth = ref(101.5)
  const iframeHeight = ref(180)

  let isDragging = false
  let startX = 0,
    startY = 0
  let initialRightStyle = 0,
    initialTop = 0

  const getClientX = (e: MouseEvent | TouchEvent) => {
    if (window.TouchEvent === undefined) return (e as MouseEvent).clientX
    if (window.MouseEvent === undefined) return (e as TouchEvent).touches[0].clientX
    if (e instanceof MouseEvent) return e.clientX
    if (e instanceof TouchEvent) return e.touches[0].clientX
    throw Error('got e has no supported type.')
  }
  const getClientY = (e: MouseEvent | TouchEvent) => {
    if (window.TouchEvent === undefined) return (e as MouseEvent).clientY
    if (window.MouseEvent === undefined) return (e as TouchEvent).touches[0].clientY
    if (e instanceof MouseEvent) return e.clientY
    if (e instanceof TouchEvent) return e.touches[0].clientY
    throw Error('got e has no supported type.')
  }

  const onDragStart = (e: MouseEvent | TouchEvent) => {
    const el = iframeContainer.value
    if (!el) return

    isDragging = true
    el.classList.add('dragging')

    startX = getClientX(e)
    startY = getClientY(e)

    initialRightStyle = parseFloat(window.getComputedStyle(el).right)
    const rect = el.getBoundingClientRect()
    initialTop = rect.top

    document.addEventListener('mousemove', onDragging)
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('touchmove', onDragging, { passive: false })
    document.addEventListener('touchend', onDragEnd)
  }

  const onDragging = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !iframeContainer.value) return
    e.preventDefault()

    const dx = getClientX(e) - startX
    const dy = getClientY(e) - startY
    iframeContainer.value.style.right = `${initialRightStyle - dx}px`
    iframeContainer.value.style.top = `${initialTop + dy}px`
  }

  const onDragEnd = () => {
    isDragging = false
    iframeContainer.value?.classList.remove('dragging')

    document.removeEventListener('mousemove', onDragging)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('touchmove', onDragging)
    document.removeEventListener('touchend', onDragEnd)

    const el = iframeContainer.value
    if (el) {
      const rect = el.getBoundingClientRect()
      const outOfBounds =
        rect.right < 0 + 101.5 ||
        rect.top < 0 ||
        rect.left > window.innerWidth - 101.5 ||
        rect.bottom > window.innerHeight

      if (outOfBounds) {
        const el = iframeContainer.value
        if (!el) return
        const rect = el.getBoundingClientRect()
        const margin = 10 // Distance from the edge
        const newTop = Math.min(
          Math.max(rect.top, margin),
          window.innerHeight - rect.height - margin,
        )
        const newRight = Math.min(
          Math.max(rect.right, margin),
          // window.innerWidth - rect.width - margin,
          rect.width + margin,
        )
        let realRight = 0
        if (newRight === 10) {
          realRight = window.innerWidth - rect.width - margin
        } else {
          if (newRight <= 101.5) {
            realRight = window.innerWidth - rect.width - margin
          } else {
            realRight = margin
          }
        }
        el.style.top = `${newTop}px`
        el.style.right = `${realRight}px`
      }
    }
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'video-ratio') {
      const ratio = event.data.ratio
      iframeHeight.value = iframeWidth.value * ratio
    }
  }

  onMounted(() => {
    const el = iframeContainer.value
    if (!el) return
    el.style.position = 'fixed'
    el.style.top = '40px'
    el.style.right = '20px'
    el.style.zIndex = '9999'

    window.addEventListener('message', handleMessage)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

  return {
    iframeSrc,
    iframeContainer,
    iframeWidth,
    iframeHeight,
    onDragStart,
  }
}
