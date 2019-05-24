class Cat {
    constructor(paramsObject) {
        this.data = paramsObject.data
        paramsObject.created()

        document.addEventListener('DOMContentLoaded', () => {
            this.rootElement = document.querySelector(paramsObject.el)
            this.handleLoopElements()
        })
    }

    hideElement(element) {
        element.style.display = 'none'
    }

    handleLoopElements() {
        var loopElements = Array.from(this.rootElement.querySelectorAll('[data-loop]'))

        loopElements.forEach(loopElement => {
            let parent = loopElement.parentElement
            let html = ''
            this.data[loopElement.dataset.loop].forEach(item => {
                let loopElementCopy = loopElement.cloneNode(true)
                let variablesInsideLoopElement = loopElement.innerHTML.match(/\{\{(.*?)\}\}/g).map(match => match.replace('{{', '').replace('}}', '').trim())
                variablesInsideLoopElement.forEach(variableInsideLoopElement => {
                    let regex = new RegExp(`\{\{(.*?${variableInsideLoopElement}.*?)\}\}`, 'g')
                    loopElementCopy.innerHTML = loopElementCopy.innerHTML.replace(regex, item[variableInsideLoopElement])
                })
                parent.appendChild(loopElementCopy)
            })
            parent.insertAdjacentHTML('beforeend', html)
            this.hideElement(loopElement)
        })
    }
}

new Cat({
    el: '#container',
    data: {
        items: []
    },
    created() {
        for(let i=0; i<=100; i++) {
            this.data.items.push({
                id: i,
                name: 'Hey ' + i
            })
        }
    }
})
