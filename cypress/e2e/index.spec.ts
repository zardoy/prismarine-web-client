/// <reference types="cypress" />
import { setOptions, cleanVisit, visit } from './shared'

// todo use ssl

const compareRenderedFlatWorld = () => {
  // wait for render
  // cy.wait(6000)
  // cy.get('body').toMatchImageSnapshot({
  //     name: 'superflat-world',
  // })
}

const testWorldLoad = () => {
  cy.document().then({ timeout: 20_000 }, doc => {
    return new Cypress.Promise(resolve => {
      doc.addEventListener('cypress-world-ready', resolve)
    })
  }).then(() => {
    compareRenderedFlatWorld()
  })
}

it('Loads & renders singleplayer', () => {
  cleanVisit('/?singleplayer=1')
  setOptions({
    localServerOptions: {
      generation: {
        name: 'superflat',
        // eslint-disable-next-line unicorn/numeric-separators-style
        options: { seed: 250869072 }
      },
    },
    renderDistance: 2
  })
  testWorldLoad()
})

it.only('Joins to server', () => {
  // visit('/?version=1.16.1')
  window.localStorage.version = ''
  visit()
  // todo replace with data-test
  cy.get('[data-test-id="connect-screen-button"]', { includeShadowDom: true }).click()
  cy.get('input#serverip', { includeShadowDom: true }).clear().focus().type('localhost')
  cy.get('input#botversion', { includeShadowDom: true }).clear().focus().type('1.16.1') // todo needs to fix autoversion
  cy.get('[data-test-id="connect-to-server"]', { includeShadowDom: true }).click()
  testWorldLoad()
})

it('Loads & renders zip world', () => {
  cleanVisit()
  cy.get('[data-test-id="select-file-folder"]', { includeShadowDom: true }).click({ shiftKey: true })
  cy.get('input[type="file"]').selectFile('cypress/superflat.zip', { force: true })
  testWorldLoad()
})

it.skip('Performance test', () => {
  // select that world
  // from -2 85 24
  // await bot.loadPlugin(pathfinder.pathfinder)
  // bot.pathfinder.goto(new pathfinder.goals.GoalXZ(28, -28))
})
