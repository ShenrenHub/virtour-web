import { getPosition, type Position } from '@/utils/Global.ts'

export const id2name = async (id: string): Promise<string> => {
  const position: Position[] = await getPosition()
  for (const pos of position) {
    if (pos.id === id) {
      return pos.name
    }
  }
  throw new Error(`${id} not found`)
}
