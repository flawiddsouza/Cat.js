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

    tokenize(string) {
        return string.split(/(\s+)/).filter(e => e.trim().length >= 1)
    }

    handleEcho(expression, element, data=null) {
        let regex = /{{ *(.*?) *}}/g
        let matches = [...expression.matchAll(regex)].map(item => item[1])

        let mathExpressionRegex = /(?:(?:^|[-+_*/])(?:\s*-?\d+(\.\d+)?(?:[eE][+-]?\d+)?\s*))+$/

        matches.forEach(match => {
            let out
            try {
                if(mathExpressionRegex.test(match)) {
                    out = eval(match)
                } else {
                    throw 'Not a math expression'
                }
                console.log('eval success: ' + match)
            } catch(e) {
                console.log('eval error: ' + match)
                let newString
                if(data) {
                    console.log(this.tokenize(match))
                    newString = match.replace(match, `data.${match}`)
                } else {
                    newString = match.replace(match, `this.${match}`)
                }
                console.log('eval fixed: ' + newString)
                out = eval(newString)
            }

            console.log('output: ' + out, '\n\n')

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
