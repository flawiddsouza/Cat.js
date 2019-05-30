import tokenize from './tokenizer'

export default class Cat {
    constructor(paramsObject) {

        if(paramsObject.hasOwnProperty('name')) {
            this.handleComponent(paramsObject)
            return
        }

        // handle data
        if(paramsObject.data) {
            for(let key in paramsObject.data) {
                this[key] = paramsObject.data[key]
            }
        }

        // handle methods
        if(paramsObject.methods) {
            for(let key in paramsObject.methods) {
                this[key] = paramsObject.methods[key]
            }
        }

        // handle created()
        if(paramsObject.created) {
            paramsObject.created.call(this)
        }

        document.addEventListener('DOMContentLoaded', () => {

            if(typeof paramsObject.el === 'string') {
                this.rootElement = document.querySelector(paramsObject.el)
            } else {
                this.rootElement = paramsObject.el
            }

            // handle html > data-loop
            this.handleLoopElements()

            // handle html > {{ }}
            this.handleEchoElements()

            // handle html > data-if, data-else-if, data-else
            this.handleConditionalElements()

            // handle html data-on-{event}
            this.handleEventListeners()

            // handle mounted()
            if(paramsObject.mounted) {
                paramsObject.mounted.call(this)
            }

        })

    }

    hideElement(element) {
        element.style.display = 'none'
    }

    showElement(element) {
        element.style.display = ''
    }

    getParsedExpression(unparsedExpression, element) {
        let tokens  = tokenize(unparsedExpression)

        let newString = ''

        tokens.forEach(token => {
            if(token.type === 'Variable') {
                if(element.loopItem && element.loopItem.hasOwnProperty(token.value)) {
                    newString += 'element.loopItem.' + token.value
                } else {
                    if(!this.hasOwnProperty(token.value)) {
                        console.error(`%c${token.value}`, 'font-weight: bold', 'has not been on the instance in ', unparsedExpression)
                        element.parentElement.style.border = '2px solid red'
                        element.parentElement.style.color = 'red'
                        element.parentElement.insertAdjacentHTML('afterbegin', '<b>Error: </b>')
                    }
                    newString += 'this.' + token.value
                }
            } else {
                newString += token.value
            }
        })

        return eval(newString)
    }

    handleEcho(unparsedExpression, element) {
        let regex = /{{ *(.*?) *}}/g
        let matches = [...unparsedExpression.matchAll(regex)].map(item => item[1])

        matches.forEach(match => {
            let out = this.getParsedExpression(match, element)

            let escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            let regex = new RegExp(`{{.*?${escapedMatch}.*?}}`)
            element.nodeValue = element.nodeValue.replace(regex, out)
        })
    }

    handleLoopElements() {
        var loopElements = Array.from(this.rootElement.querySelectorAll('[data-loop]'))

        loopElements.forEach(loopElement => {

            let parent = loopElement.parentElement

            let html = ''

            this[loopElement.dataset.loop].forEach(item => {

                let loopElementCopy = loopElement.cloneNode(true)
                delete loopElementCopy.dataset.loop

                loopElementCopy.childNodes[0].loopItem = item

                parent.appendChild(loopElementCopy)

            })

            parent.insertAdjacentHTML('beforeend', html)

            // loopElement.remove()
            this.hideElement(loopElement)

        })
    }

    textNodesUnder(element, match=null) {
        let n
        let textNodes = []
        let walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false)
        while(n=walk.nextNode()) {
            textNodes.push(n)
        }
        if(match) {
            textNodes = textNodes.filter(textNode => textNode.nodeValue.match(match))
        }
        return textNodes
    }

    handleEchoElements() {
        let textNodes = this.textNodesUnder(this.rootElement, /{{.*?}}/g)
        textNodes = textNodes.filter(textNode => !textNode.parentElement.dataset.loop) // exclude loop elements
        textNodes.forEach(textNode => {
            this.handleEcho(textNode.nodeValue, textNode)
        })
    }

    handleConditionalElements() {
        let ifConditionalElements = this.rootElement.querySelectorAll('[data-if]')

        ifConditionalElements.forEach(ifConditionalElement => {
            let conditionals = {}

            conditionals['if'] = ifConditionalElement
            this.hideElement(ifConditionalElement)
            conditionals['elseIf'] = []

            let nextElementSibling =  ifConditionalElement.nextElementSibling

            while(nextElementSibling) {
                if(nextElementSibling.dataset.hasOwnProperty('elseIf')) {
                    this.hideElement(nextElementSibling)
                    conditionals['elseIf'].push(nextElementSibling)
                    nextElementSibling = nextElementSibling.nextElementSibling
                } else if(nextElementSibling.dataset.hasOwnProperty('else')) {
                    this.hideElement(nextElementSibling)
                    conditionals['else'] = nextElementSibling
                    nextElementSibling = null
                } else {
                    nextElementSibling = null
                }
            }

            let parsedIfCondition = this.getParsedExpression(conditionals.if.dataset.if, conditionals.if)
            parsedIfCondition = eval(parsedIfCondition)

            if(parsedIfCondition) {
                this.showElement(conditionals.if)
            } else {
                let conditionMet = false

                conditionals.elseIf.forEach(elseIf => {
                    if(!conditionMet && eval(elseIf.dataset.elseIf)) {
                        conditionMet = true
                        this.showElement(elseIf)
                    }
                })

                if(!conditionMet && conditionals.else) {
                    conditionMet =  true
                    this.showElement(conditionals.else)
                }
            }
        })
    }

    handleEventListeners() {
        let eventListeners = this.rootElement.querySelectorAll(`
            [data-on-click],
            [data-on-input],
            [data-on-blur],
            [data-on-focus],
            [data-on-mouseover],
            [data-on-mousedown],
            [data-on-mouseup],
            [data-on-keyup],
            [data-on-keydown]
        `)

        eventListeners.forEach(eventListener => {
            let event = Object.keys(eventListener.dataset)[0].replace('on', '').toLowerCase()
            let eventListenerExpression = Object.values(eventListener.dataset)[0]
            eventListener.addEventListener(event, ($event) => {
                let tokens  = tokenize(eventListenerExpression)

                let parsedExpression = ''

                tokens.forEach(token => {
                    if(token.type === 'Variable') {
                        parsedExpression += 'this.' + token.value
                    } else {
                        parsedExpression += token.value
                    }
                })

                eval(parsedExpression)
            })
        })
    }

    handleComponent(paramsObject) {
        customElements.define(paramsObject.name, class extends HTMLElement {
            constructor() {
                super()
                let shadowElement = this.attachShadow({ mode: 'open' })
                shadowElement.innerHTML = paramsObject.template
            }

            connectedCallback() {
                new Cat({
                    el: this.shadowRoot,
                    data: paramsObject.data,
                    methods: paramsObject.methods,
                    created: paramsObject.created,
                    mounted: paramsObject.mounted
                })
            }
        })
    }
}
