/// <reference types="cypress" />
import { BenchmarkAdapter } from '../../src/benchmarkAdapter'
import { setOptions, cleanVisit, visit } from './shared'

it('Benchmark rendering performance', () => {
  cleanVisit('/?openBenchmark=true&renderDistance=5')
  // wait for render end event
  return cy.document().then({ timeout: 120_000 }, doc => {
    return new Cypress.Promise(resolve => {
      cy.log('Waiting for world to load')
      doc.addEventListener('cypress-world-ready', resolve)
    }).then(() => {
      cy.log('World loaded')
    })
  }).then(() => {
    cy.window().then(win => {
      const adapter = win.benchmarkAdapter as BenchmarkAdapter
      const renderTimeWorst = adapter.worstRenderTime
      const renderTimeAvg = adapter.averageRenderTime
      const fpsWorst = 1000 / renderTimeWorst
      const fpsAvg = 1000 / renderTimeAvg
      const totalTime = adapter.worldLoadTime
      const { gpuInfo } = adapter

      const messages = [
        `Worst FPS: ${fpsWorst.toFixed(2)}`,
        `Average FPS: ${fpsAvg.toFixed(2)}`,
        `Total time: ${totalTime.toFixed(2)}s`,
        `Memory usage average: ${adapter.memoryUsageAverage.toFixed(2)}MB`,
        `Memory usage worst: ${adapter.memoryUsageWorst.toFixed(2)}MB`,
        `GPU info: ${gpuInfo}`,
      ]
      for (const message of messages) {
        cy.log(message)
      }
      cy.writeFile('benchmark.txt', messages.join('\n'))
    })
  })
})
