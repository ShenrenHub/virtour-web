import type { Position } from '@/utils/Global.ts'
import { Debugger } from '@/dh_controller/debugger.ts'
export const checkIfExtraExists = (positions:Position[], current_scene: String): boolean => {
  if (current_scene.startsWith('_extra_')) {
    Debugger.log(`Current scene is an extra scene: ${current_scene}`)
    return true
  }
  for (const position of positions) {
    if (position.id === current_scene) {
      if (position.extra && position.extra.length > 0) {
        Debugger.log(`Extra exists for scene: ${current_scene}`)
        return true
      } else {
        Debugger.log(`No extra found for scene: ${current_scene}`)
        return false
      }
    }
  }
  return false
}
