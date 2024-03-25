import { AppOptions } from '../../src/optionsStorage'

export const cleanVisit = (url?) => {
    cy.clearLocalStorage()
    visit(url)
}
export const visit = (url = '/') => {
    window.localStorage.cypress = 'true'
    cy.visit(url)
}
export const setOptions = (options: Partial<AppOptions>) => {
    cy.window().then(win => {
        Object.assign(win['options'], options)
    })
}
