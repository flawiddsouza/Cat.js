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
