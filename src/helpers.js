export function forEach(array, callback, scope) {
    for (var i = 0; i < array.length; i++) {
        callback.call(scope, array[i], i)
    }
}

export function getDatasetElements(parentElement, datasetWildcard) {
    let elements = []
    forEach(parentElement.getElementsByTagName('*'), element => {
        let datasetKeys = Object.keys(element.dataset)
        datasetKeys.forEach(datasetKey => {
            if(datasetKey.startsWith(datasetWildcard)) {
                elements.push(element)
            }
        })
    })
    return elements
}

export function textNodesUnder(element, match=null) {
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

export function hideElement(element) {
    element.hidden = true
}

export function showElement(element) {
    element.hidden = ''
}
