import controller from './controller.ts'
import DigitalHuman from './controller.ts'
import { backendUrl, VoiceTimbre } from '@/utils/Global'

// 定义返回数据的类型
interface StreamChunk {
  chunk_id: number
  audio: string // base64
  answer: string
}

// 传入iframeWindow是iframe的对象
export async function getAndPlayAudio(
  message: string,
  iframeWindow: any,
  voice_timbre: VoiceTimbre,
): Promise<void> {
  console.log(iframeWindow, 'iframeWindow')
  const query = message
  voice_timbre = <VoiceTimbre>Object.keys(VoiceTimbre).find(key => VoiceTimbre[key as keyof typeof VoiceTimbre] === voice_timbre)
  console.warn(JSON.stringify({ query, voice_timbre }));
  try {
    const response = await fetch(`${backendUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, voice_timbre }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 确保响应体是可读流
    if (!response.body) {
      throw new Error('Response body is not available')
    }

    // 调用我们提取出的流处理函数
    await DigitalHuman.speakStream(response, iframeWindow)
  } catch (error) {
    console.error('Stream error:', error)
    throw error
  }
}

;(window as any).getAndPlayAudio = getAndPlayAudio

export async function playAudio(audioData: ArrayBuffer): Promise<void> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(
      audioData,
      (buffer: AudioBuffer) => {
        const source = audioContext.createBufferSource()
        source.buffer = buffer
        source.connect(audioContext.destination)
        source.onended = () => {
          resolve()
          audioContext.close()
        }
        source.start(0)
      },
      (error: DOMException) => {
        reject(error)
      },
    )
  })
}

;(window as any).playAudio = playAudio
