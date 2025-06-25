import { Debugger } from './debugger.ts'
import { playAudio } from './audio'
import type { Pannellum } from '@/utils/Global.ts'

declare const parent: any
declare const Module: any

interface StreamChunk {
  chunk_id: number
  audio: string // base64
  answer: string
}

class DigitalHuman {
  static speak = (message: Uint8Array, iframeModule: any): void => {
    if (!iframeModule) {
      console.log('Module未定义')
      return
    }

    // 将 module 存储为局部变量
    const moduleInstance = iframeModule

    const arrayBuffer = message.buffer
    const view: Uint8Array = new Uint8Array(arrayBuffer)
    const arrayBufferPtr: number = iframeModule._malloc(arrayBuffer.byteLength)
    console.log('arrayBufferPtr', arrayBufferPtr.toString())
    console.log('view', view)

    moduleInstance.HEAPU8.set(view, arrayBufferPtr)
    console.log('buffer.byteLength', arrayBuffer.byteLength)
    moduleInstance._setAudioBuffer(arrayBufferPtr, arrayBuffer.byteLength)
    moduleInstance._free(arrayBufferPtr)
  }

  static speakStream = async (response: Response, iframeWindow: any): Promise<void> => {
    const iframeModule = iframeWindow.contentWindow.Module
    const reader = response.body!.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log('Stream completed')
        break
      }

      // 累积解码到 buffer
      buffer += decoder.decode(value, { stream: true })

      // 按行拆分，保留不完整的那一部分
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const chunk: StreamChunk = JSON.parse(line)
          console.log('Received chunk:', chunk)

          // base64 解码
          const binary = atob(chunk.audio)
          const audioBytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) {
            audioBytes[i] = binary.charCodeAt(i)
          }

          // 播放
          this.speak(audioBytes, iframeModule)
          await playAudio(audioBytes.buffer)
        } catch (e) {
          console.error('Error parsing JSON:', e)
        }
      }
    }

    // 处理剩下的未换行部分
    if (buffer.trim()) {
      try {
        const finalChunk: StreamChunk = JSON.parse(buffer)
        console.log('Received final chunk:', finalChunk)
      } catch (e) {
        console.error('Error parsing final JSON:', e)
      }
    }
  }
}

;(window as any).DigitalHuman = DigitalHuman
export default DigitalHuman

declare global {
  interface Window {
    selectedDhlive: Ref<UnwrapRef<string>, UnwrapRef<string> | string>
    Module?: {
      _malloc: (size: number) => number
      _setAudioBuffer: (ptr: number, length: number) => void
      _free: (ptr: number) => void
      HEAPU8: Uint8Array
      // You can add other functions or properties as needed.
    }
    pannellum: Pannellum
    innerWidth: number
    addEventListener(message1: string, param2: (event) => void): void
  }
}
