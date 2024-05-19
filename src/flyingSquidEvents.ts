import { showModal } from './globalState'
import { chatInputValueGlobal } from './react/Chat'
import { showNotification } from './react/NotificationProvider'

export default () => {
  localServer!.on('warpsLoaded', () => {
    if (!localServer) return
    showNotification(`${localServer.warps.length} Warps loaded`, 'Use /warp <name> to teleport to a warp point.', false, 'label-alt', () => {
      chatInputValueGlobal.value = '/warp '
      showModal({ reactType: 'chat' })
    })
  });

  (localServer as any).loadChunksOptimized = (chunks) => {
    const workersNum = 5
    const workers = [] as Worker[]

    for (let i = 0; i < workersNum; i++) {
      const worker = new Worker('./worldSaveWorker.js')
      workers.push(worker)
    }

    console.time('chunks-main')
    for (const [i, worker] of workers.entries()) {
      worker.postMessage({
        type: 'readChunks',
        chunks: chunks.slice(i * chunks.length / workersNum, (i + 1) * chunks.length / workersNum),
        folder: localServer!.options.worldFolder + '/region'
      })
    }

    let finishedWorkers = 0

    for (const worker of workers) {
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      worker.onmessage = (msg) => {
        if (msg.data.type === 'done') {
          finishedWorkers++
          if (finishedWorkers === workersNum) {
            console.timeEnd('chunks-main')
          }
        }
      }
    }
  }
}
