// export const backendUrl = 'https://virtour.apricityx.top:8002'
export const backendUrl = 'https://127.0.0.1:8000'

export const blobToBase64 = (blob: Blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      resolve(reader.result) // reader.result 是一个 base64 编码的 Data URL
    }

    reader.onerror = reject

    reader.readAsDataURL(blob) // 读取 Blob 并转换为 base64 的 Data URL
  })
}

let positions: Position[] = []

export const getPosition: () => Promise<Position[]> = async () => {
  if (positions.length > 0) {
    console.log('Hit! Using cached positions.')
    return positions
  }
  console.log('Miss! Fetching positions from backend.')
  const url = `${backendUrl}/assets/positions.json`
  const headers = {
    'Content-Type': 'application/json',
  }
  positions = await fetch(url, {
    method: 'GET',
    headers: headers,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      console.log(response)
      return response.json()
    })
    .then((data) => {
      return data
    })
    .catch((error) => {
      console.error('There was a problem with the fetch operation:', error)
    })
  for (const pos of positions) {
    if (pos.extra) {
      for (const extra of pos.extra) {
        extra.extra_id = '_extra_' + extra.extra_id
      }
    }
  }
  return positions
}

interface scene {
  type: string
  panorama: string
  yaw: number
  pitch: number
}
export type ExtraImage = {
  extra_id: string
  extra_name: string
  extra_img: string
  extra_recommend_picture: string
}

export interface Position {
  id: string
  name: string
  action: string
  img: string
  recommend_picture: string
  extra: ExtraImage []
}

export interface Config {
  default: {
    firstScene: string
    sceneFadeDuration: number
  }
  scenes: {
    [scene: string]: {
      type: string
      panorama: string
      yaw: number
      pitch: number
      deviceOrientationControls: boolean
    }
  }
}

export interface Pannellum {
  loadScene(sceneId: string, pitch: number, yaw: number, hfov: number): Pannellum

  addScene(sceneI: string, config: scene): Pannellum

  viewer(container: HTMLElement, config: Config): Pannellum
}

/**
 * 此定义来自后端
 */
export enum VoiceTimbre {
  TEENAGER = '青少年',
  ADULT = '青壮年',
  ELDERLY = '中老年',
}
