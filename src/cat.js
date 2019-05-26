import tokenize from './tokenizer'

export default class Cat {
    constructor(paramsObject) {

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

            this.rootElement = document.querySelector(paramsObject.el)

            // handle html > data-loop
            this.handleLoopElements()

            // handle mounted()
            if(paramsObject.mounted) {
                paramsObject.mounted.call(this)
            }

        })

    }

    hideElement(element) {
        element.style.display = 'none'
    }

    handleEcho(expression, element, data=null) {
        let regex = /{{ *(.*?) *}}/g
        let matches = [...expression.matchAll(regex)].map(item => item[1])

        matches.forEach(match => {
            let tokens  = tokenize(match)

            let newString = ''

            console.log(tokens)
            tokens.forEach(token => {
                if(token.type === 'Variable') {
                    if(data.hasOwnProperty(token.value)) {
                        newString += 'data.' + token.value
                    } else if(this.hasOwnProperty(token.value)) {
                        newString += 'this.' + token.value
                    } else {
                        newString += token.value
                    }
                } else {
                    newString += token.value
                }
            })

            let out = eval(newString)

            let escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            let regex = new RegExp(`{{.*?${escapedMatch}.*?}}`)
            element.innerHTML = element.innerHTML.replace(regex, out)
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

                this.handleEcho(loopElement.innerHTML, loopElementCopy, item)

                parent.appendChild(loopElementCopy)

            })

            parent.insertAdjacentHTML('beforeend', html)

            this.hideElement(loopElement)

        })
    }
}
