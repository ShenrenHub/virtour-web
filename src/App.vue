<script setup lang="ts">
import { id2name } from '@/utils/PositionTranslator.ts'
import { watch } from 'vue'
/**
 * 全局设置与选择数字人形象
 */
const settings = reactive({
  autoJumping: true, // 是否让MCP自动跳转到景点
})
const selectedDhlive = ref('青年') // 默认选择的数字人形象

onMounted(() => {
  window.selectedDhlive = selectedDhlive
})

watch(selectedDhlive, (val) => {
  window.selectedDhlive = val
  // 通知 iframe
  const iframe = document.querySelector('iframe')
  iframe?.contentWindow?.postMessage({ type: 'selectedDhliveChanged', value: val }, '*')
})


/**
 * 兼容性检测
 */
if (typeof VideoDecoder !== 'undefined') {
  // 使用 VideoDecoder 正常播放
} else {
  console.error('VideoDecoder not supported on this browser.')
  alert('您当前的浏览器不支持VideoDecoder，请使用Chrome或Edge浏览器')
  // firefox
}

import { type CSSProperties, reactive } from 'vue'

import { useMiniLiveIframe } from '@/dh_controller/miniLiveIframe'
import DigitalHuman from '@/dh_controller/controller.ts'
import { getAndPlayAudio } from '@/dh_controller/audio.ts'
import MicRecorder from '@/utils/MicRecorder'
import {
  backendUrl,
  blobToBase64,
  getPosition,
  type Pannellum,
  type Position,
} from '@/utils/Global'
import { computed, onMounted, ref } from 'vue'

/**
 * 数字人
 */
const { iframeSrc, iframeContainer, iframeWidth, iframeHeight, onDragStart } = useMiniLiveIframe()

/**
 * 全景图
 */

const panorama_map = ref<HTMLDivElement | null>(null)
let viewer: Pannellum

onMounted(async () => {
  const positions = await getPosition()
  const config: {
    default: { firstScene: string; sceneFadeDuration: number }
    scenes: {
      default: {
        type: string
        panorama: string
        yaw: number
        pitch: number
        hfov: number
        autoLoad: boolean
        deviceOrientationControls: boolean
      }
    }
  } = {
    default: {
      firstScene: 'default',
      sceneFadeDuration: 1000, // 场景切换过渡时间（毫秒）
    },
    scenes: {
      default: {
        type: 'equirectangular',
        panorama: `${backendUrl}/assets/cover.jpg`, // 替换为第一张全景图路径
        yaw: 0, // 初始水平视角
        pitch: 40.86, // 初始垂直视角
        hfov: 80,
        autoLoad: true,
        deviceOrientationControls: true,
      },
    },
  }
  for (const position of positions) {
    config['scenes'][position.id] = {
      type: 'equirectangular',
      panorama: `${backendUrl}/${position.img}`,
      yaw: 0, // 初始水平视角
      pitch: 0, // 初始垂直视角
      autoLoad: true,
    }
  }
  console.log('config:', config)
  viewer = window.pannellum.viewer(panorama_map.value as HTMLElement, config)
})

const moveToById = async (id: string) => {
  console.log('Moving to position with ID:', id)
  viewer.loadScene(id, 0, 0, 70)
}

/**
 * 遮罩层
 */
const pageLoading = ref(true)
const pageLoadProgress = ref(0)
let progress = ref(0)
onMounted(() => {
  (window as Window).addEventListener('message', (event) => {
    if (event.data?.type === 'progress') {
      progress.value = Math.round(event.data.value * 100);
      if (progress.value >= 100) {
        pageLoading.value = false;
      }
    }
  });
});
// const loadingProgress = setInterval(() => {
//   // console.log(dh.value)
//   try {
//     progress = dh.value.contentWindow.dhLoadingProgress
//     // console.log('从Iframe中获取到：', progress)
//   } catch (e) {
//     progress = 0
//   }
//   // console.log('progress:', progress)
//   // 如果progress为1则移除当前interval
//   pageLoadProgress.value = progress
//   if (progress === 1) {
//     pageLoading.value = false
//     clearInterval(loadingProgress)
//   }
// }, 10)

const dh = ref()
/*       聊天框相关控件       */
const recorder = new MicRecorder()
const message = ref('')
const tab = ref('one')
const isRecording = ref(false)
const isQuerying = ref(false)
const startRecording = async () => {
  console.log('startRecording')
  isRecording.value = true
  // 调用麦克风
  await recorder.startRecording()
}
const stopRecording = async () => {
  console.log('stopRecording')
  // 添加停止录音的逻辑
  isRecording.value = false
  const recordingBlob = await recorder.stopRecording()
  console.log('Recording File: ', recordingBlob)
  console.log('Record Time:', recorder.getAudioTime())
  isQuerying.value = true
  // 向后端发送请求
  // 将recordingBlob转换为base64
  const base64Recording = await blobToBase64(recordingBlob)
  console.log('base64Recording: ', recordingBlob)
  // 获取建议
  ;(async () => {
    // 获取跳转建议
    const response = await fetch(`${backendUrl}/voice_suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recording: base64Recording }),
    })
    const data = await response.json()
    console.log('Suggestions:', data)
    if (data['suggestion'].length > 0) {
      showSnackbar({
        position_name: await id2name(data['suggestion']), // 跳转到地方的位置 这里需要做一次翻译 将代号转换为具体的地点
        position_id: data['suggestion'] as string,
      }).then()
    }
  })().then(() => {})

  // 获取语音
  await fetch(`${backendUrl}/voice_ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recording: base64Recording }),
  })
    .then((response) => {
      if (response.ok) {
        console.log('上传成功')
        // 如果后端返回 JSON，可以进一步解析
        return response
      } else {
        throw new Error(`上传失败，状态码：${response.status}`)
      }
    })
    .then(async (data) => {
      await DigitalHuman.speakStream(data, dh.value)
      isQuerying.value = false
    })
    .catch((error) => {
      console.error('上传过程中出错:', error)
      isQuerying.value = false
    })
}

const textFieldLoading = ref(false)
const sendTextMessage = async () => {
  console.log('sendTextMessage')
  if (message.value !== '') {
    // 发送消息
    console.log('发送消息:', message.value)
    textFieldLoading.value = true
    console.log(dh.value)
    const dhIframe = dh.value
    try {
      ;(async () => {
        // 获取跳转建议
        const response = await fetch(`${backendUrl}/suggest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: message.value }),
        })
        const data = await response.json()
        console.log('Suggestions:', data)
        if (data['suggestion'].length > 0) {
          showSnackbar({
            position_name: await id2name(data['suggestion']), // 跳转到地方的位置 这里可能需要做一次翻译 将代号转换为具体的地点
            position_id: data['suggestion'],
          }).then()
        }
      })().then(() => {})
      await getAndPlayAudio(message.value, dhIframe)
      message.value = '' // 清空输入框
    } catch (e) {
      console.error('获取音频失败:', e)
      message.value = '' // 清空输入框
      alert('服务器忙或服务器未启动，请稍后再试')
    }
    textFieldLoading.value = false
  }
}

/**
 * 推荐显示窗
 * */
const recommendationImages: Position[] = []

const loadRecommendation = async () => {
  const positions = await getPosition()
  for (const pos of positions) {
    recommendationImages.push(pos)
  }
  console.log('推荐:', recommendationImages)
}

loadRecommendation()

const handleRecommendationClick = (action: string) => {
  console.log('执行操作：', action)
  viewer.loadScene(action, 0, 0, 70)
}

/**
 * 提示
 * */
const snackbar = ref(false)
const suggested_position_name = ref('')
const suggested_position_id = ref('')
// const suggested_position_name = ref('')
// const loadSuggestion = async () => {
//   suggested_position_name.value = (await getPosition()).find(
//     (item) => item.action === suggested_position,
//   )
// }
const showSnackbar = async ({
  position_name,
  position_id,
}: {
  position_name: string
  position_id: string
}) => {
  // 如果设置了自动跳转，并且位置名称不为空，则自动跳转
  if (settings.autoJumping && position_name !== 'None') {
    await moveToById(position_id)
    return
  }
  if (position_name === 'None' || position_id.includes('Error')) {
    console.log('建议为空或者请求出错')
    return
  }
  suggested_position_name.value = position_name
  suggested_position_id.value = position_id
  snackbar.value = true
}

const isMobile = ref(false)

onMounted(() => {
  isMobile.value = window.innerWidth <= 800
})

// 文本样式
const textStyle = computed<CSSProperties>(() => ({
  marginTop: '4px',
  textAlign: 'center',
  fontSize: isMobile.value ? '14px' : '16px',
  color: '#555',
}))

// // 图片样式
const imageStyle = computed(() => {
  return {
    width: isMobile.value ? '88px' : '120px', // 移动端更小
    height: isMobile.value ? '55px' : '80px',
    boxShadow: 'none',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  }
})
</script>

<style>
@import '../node_modules/@syncfusion/ej2-base/styles/material.css';
@import '../node_modules/@syncfusion/ej2-vue-buttons/styles/material.css';
@import '../node_modules/@syncfusion/ej2-buttons/styles/material.css';
@import '../node_modules/@material-design-icons/font';
</style>

<template>
  <!-- 全景视窗 fixed-->
  <div
    style="height: 100%; width: 100%; position: fixed; top: 0; left: 0; z-index: 1"
    ref="panorama_map"
  ></div>

  <!--  数字人窗口-->
  <div ref="iframeContainer" class="draggable-container" style="z-index: 2">
    <div class="drag-overlay" @mousedown="onDragStart" @touchstart="onDragStart"></div>
    <iframe
      ref="dh"
      :src="iframeSrc"
      :style="{ width: iframeWidth + 'px', height: iframeHeight + 'px' }"
    >
    </iframe>
  </div>

  <!--  聊天窗口  -->
  <v-card
    class="chat-box"
    width="100%"
    style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 2"
    :loading="textFieldLoading || isQuerying"
  >
    <v-alert style="z-index: 10000" v-if="isRecording" variant="tonal" type="warning" height="50px">
      <span style="margin-left: 10px">说话中...</span>
    </v-alert>
    <v-tabs v-model="tab" bg-color="black" height="30px" align-tabs="center" grow>
      <v-tab value="one">语音</v-tab>
      <v-tab value="two">文字</v-tab>
      <v-tab value="three">推荐</v-tab>
      <v-tab value="four">设置</v-tab>
    </v-tabs>

    <v-card-text>
      <v-tabs-window v-model="tab">
        <!--语音输入-->
        <v-tabs-window-item value="one">
          <v-btn
            @mousedown="startRecording"
            @mouseup="stopRecording"
            @touchstart="startRecording"
            @touchend="stopRecording"
            style="width: 100%; user-select: none"
            variant="outlined"
            :disabled="isQuerying || textFieldLoading"
          >
            按住说话
          </v-btn>
        </v-tabs-window-item>
        <!--文字输入-->
        <v-tabs-window-item value="two">
          <v-card>
            <v-text-field
              v-model="message"
              label="与智能体对话..."
              variant="filled"
              auto-grow
              :loading="textFieldLoading || isQuerying"
              :disabled="textFieldLoading || isQuerying"
            ></v-text-field>
            <v-btn
              style="width: 100%"
              :disabled="textFieldLoading || isQuerying"
              @click="sendTextMessage"
              >发送
            </v-btn>
          </v-card>
        </v-tabs-window-item>
        <!--        推荐-->
        <v-tabs-window-item value="three">
          <v-card>
            <v-container fluid>
              <v-slide-group center-active mandatory>
                <div
                  v-for="(img, index) in recommendationImages"
                  :key="index"
                  class="image-item"
                  @click="moveToById(img.id)"
                >
                  <v-img
                    :src="`${backendUrl}/${img.recommend_picture}`"
                    :alt="img.name"
                    :style="imageStyle"
                    cover
                    class="hover-effect"
                  />
                  <p :style="textStyle">
                    {{ img.name }}
                  </p>
                </div>
              </v-slide-group>
            </v-container>
            <p style="margin-bottom: 0; text-align: center; font-size: 12px; color: gray">
              左右滑动查看更多
            </p>
          </v-card>
        </v-tabs-window-item>
        <v-tabs-window-item value="four">
          <v-card>
            <v-card-text>
              <p>设置选项</p>

              <v-select
                label="选择数字人形象"
                :items="['儿童', '青年', '中年']"
                v-model="selectedDhlive"
              />

              <v-switch label="启用自动跳转景点" v-model="settings.autoJumping" />
            </v-card-text>
          </v-card>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
  </v-card>
  <v-snackbar v-model="snackbar" style="z-index: 100000">
    <p>建议前往 {{ suggested_position_name }}</p>
    <v-btn variant="text" style="width: 100%" @click="moveToById(suggested_position_id)"
      >带我去吧</v-btn
    >
    <template v-slot:actions>
      <v-btn color="pink" variant="text" @click="snackbar = false">忽略</v-btn>
    </template>
  </v-snackbar>
  <!--  遮罩层-->
  <v-overlay :model-value="pageLoading" class="align-center justify-center" style="z-index: 999999">
    <v-progress-circular indeterminate color="white" />

  </v-overlay>
</template>
<style scoped>
.draggable-container {
  position: absolute;
  transition:
    box-shadow 0.25s ease,
    transform 0.25s ease;
  border-radius: 12px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  will-change: transform;
}

/* 👇 遮罩层，透明且覆盖整个 iframe 区域，负责触发拖动事件 */
.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: grab;
  z-index: 2;
}

html,
body,
input,
textarea,
select {
  font-size: 16px; /* iOS Safari 自动放大的临界点 */
}

.hover-effect:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-4px);
}

.image-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 12px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.image-item:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-4px);
}

.image-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 8px;
  min-width: 100px; /* 保证滑动空间，图片越小越重要 */
  flex-shrink: 0;
}
</style>
