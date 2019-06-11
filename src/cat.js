import tokenize from './tokenizer'

export default class Cat {
    constructor(paramsObject) {

        if(paramsObject.hasOwnProperty('name')) {
            this.handleComponent(paramsObject)
            return
        }

        this.parsedExpressions = {}
        this.dataBindings = {}

        this.proxy = new Proxy(this, this.handleDataBindings())

        // handle data
        if(paramsObject.data) {
            for(let key in paramsObject.data) {
                this[key] = paramsObject.data[key]
                this.dataBindings[key] = [];
            }
        }

        // handle methods
        if(paramsObject.methods) {
            for(let key in paramsObject.methods) {
                this[key] = (...args) => paramsObject.methods[key].call(this.proxy, ...args)
            }
        }

        // handle created()
        if(paramsObject.created) {
            paramsObject.created.call(this.proxy)
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

            // handle html > data-value
            this.handleDataValueElements()

            // handle mounted()
            if(paramsObject.mounted) {
                paramsObject.mounted.call(this.proxy)
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
        // if(!this.parsedExpressions.hasOwnProperty(unparsedExpression)) { // removing this reduces performance but enables dataBindings
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
                        } else {
                            if(this.dataBindings.hasOwnProperty(token.value) && !this.dataBindings[token.value].includes(element)) {
                                this.dataBindings[token.value].push(element)
                            }
                        }
                        newString += 'this.proxy.' + token.value
                    }
                } else {
                    newString += token.value
                }
            })

            this.parsedExpressions[unparsedExpression] = newString
        // }

        let result = new Function('element', 'return ' + this.parsedExpressions[unparsedExpression]).call(this, element)

        return result
    }

    handleEcho(unparsedExpression, element) {
        let regex = /{{ *(.*?) *}}/g
        let matches = [...unparsedExpression.matchAll(regex)].map(item => item[1])

        if(!element.parentElement.hasOwnProperty('unparsedExpression')) {
            element.parentElement.unparsedExpression = unparsedExpression
        } else {
            element.nodeValue = element.parentElement.unparsedExpression
        }

        matches.forEach(match => {
            let out = this.getParsedExpression(match, element)

            let escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            let regex = new RegExp(`{{.*?${escapedMatch}.*?}}`)
            element.nodeValue = element.nodeValue.replace(regex, out)
        })
    }

    handleLoopElement(loopElement) {
        let insertedElement = null

        if(this.dataBindings.hasOwnProperty(loopElement.dataset.loop) && !this.dataBindings[loopElement.dataset.loop].includes(loopElement)) {
            this.dataBindings[loopElement.dataset.loop].push(loopElement)
        }

        if(!loopElement.hasOwnProperty('loopItems')) {
            loopElement.loopItems = []
        } else {
            loopElement.loopItems.forEach(loopItem => loopItem.remove())
            this.showElement(loopElement)
        }

        this[loopElement.dataset.loop].forEach(item => {

            let loopElementCopy = loopElement.cloneNode(true)
            delete loopElementCopy.dataset.loop

            let textNodesUnderElementCopy = this.textNodesUnder(loopElementCopy)
            textNodesUnderElementCopy.forEach(textNode => {
                textNode.loopItem = item
                textNode.parentElement.loopItem = item
            })

            if(!insertedElement) {
                loopElement.insertAdjacentElement('afterend', loopElementCopy)
            } else {
                insertedElement.insertAdjacentElement('afterend', loopElementCopy)
            }

            loopElement.loopItems.push(loopElementCopy)

            insertedElement = loopElementCopy

        })

        this.hideElement(loopElement)
    }

    handleLoopElements() {
        var loopElements = Array.from(this.rootElement.querySelectorAll('[data-loop]'))

        loopElements.forEach(loopElement => {
            this.handleLoopElement(loopElement)
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

    handleEchoElements(element=null) {
        if(!element) {
            element = this.rootElement
        }
        let textNodes = this.textNodesUnder(element, /{{.*?}}/g)
        textNodes = textNodes.filter(textNode => !textNode.parentElement.dataset.loop) // exclude loop elements
        textNodes = textNodes.filter(textNode => !textNode.parentElement.parentElement.dataset.loop) // exclude loop elements that have nested elements
        textNodes = textNodes.filter(textNode => !textNode.parentElement.parentElement.parentElement.dataset.loop) // exclude loop elements that have nested elements inside nested elements
        textNodes.forEach(textNode => {
            this.handleEcho(textNode.nodeValue, textNode)
        })
    }

    handleConditionalElement(ifConditionalElement) {
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
    }

    handleConditionalElements() {
        let ifConditionalElements = this.rootElement.querySelectorAll('[data-if]')

        ifConditionalElements.forEach(ifConditionalElement => {
            this.handleConditionalElement(ifConditionalElement)
        })
    }

    handleEventListeners(element=null) {
        if(!element) {
            element = this.rootElement
        }

        let eventListeners = element.querySelectorAll(`
            [data-on-click],
            [data-on-input],
            [data-on-blur],
            [data-on-focus],
            [data-on-mouseover],
            [data-on-mousedown],
            [data-on-mouseup],
            [data-on-keyup],
            [data-on-keydown],
            [data-on-submit]
        `)

        eventListeners.forEach(eventListener => {
            let event = Object.keys(eventListener.dataset)[0].replace('on', '').toLowerCase()
            let eventListenerExpression = Object.values(eventListener.dataset)[0]
            eventListener.addEventListener(event, ($event) => {
                let tokens  = tokenize(eventListenerExpression)

                let parsedExpression = ''

                tokens.forEach(token => {
                    if(token.type === 'Variable') {
                        if(eventListener.loopItem && eventListener.loopItem.hasOwnProperty(token.value)) {
                            parsedExpression += 'eventListener.loopItem.' + token.value
                        } else if(this.hasOwnProperty(token.value)) {
                            parsedExpression += 'this.proxy.' + token.value
                        } else {
                            parsedExpression += token.value
                        }
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

    handleDataBindings() {
        let _this = this
        return {
            // get: function(target, prop, receiver) {
            //     return Reflect.get(...arguments)
            // },
            set(obj, prop, value) {
                Reflect.set(...arguments)
                if(_this.dataBindings.hasOwnProperty(prop)) {
                    _this.dataBindings[prop].forEach(elementToRefresh => {
                        if(elementToRefresh.nodeType === Node.ELEMENT_NODE && elementToRefresh.dataset.hasOwnProperty('value')) {
                            _this.handleDataValueElement(elementToRefresh)
                        } else if(elementToRefresh.dataset.hasOwnProperty('loop')) {
                            _this.handleLoopElement(elementToRefresh)
                            elementToRefresh.loopItems.forEach(loopItem => {
                                _this.handleEchoElements(loopItem)
                                _this.handleEventListeners(loopItem)
                            })
                        } else {
                            _this.handleEcho(elementToRefresh.parentElement.unparsedExpression, elementToRefresh)
                        }
                    })
                }
                return true
            }
        }
    }

    static component(paramsObject) {
        new Cat(paramsObject)
    }

    handleDataValueElement(element) {
        element.value = this.getParsedExpression(element.dataset.value, element)
    }

    handleDataValueElements() {
        let inputDataValueElements = this.rootElement.querySelectorAll('input[data-value]')
        inputDataValueElements.forEach(inputDataValueElement => {
            this.handleDataValueElement(inputDataValueElement)
        })
    }
}
