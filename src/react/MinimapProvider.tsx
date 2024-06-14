import { useEffect, useState } from 'react'
import Minimap from './Minimap'


export default () => {
  const [worldColors, setWorldColors] = useState<string[][]>([])

  useEffect(() => {
    const newColors = [] as string[][]


  }, [])

  return <div>
    <Minimap worldColors={worldColors} />
  </div>
}
