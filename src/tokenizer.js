'use strict'

let separators = [
    ' ',
    ':',
    '?',
    '+',
    '-',
    '/',
    '*',
    '=',
    '(',
    ')'
]

let keywords = ['if', 'else', 'else if']

function tokenize(string) {
    let characters = string.split('')

    let tokens = []
    let token = ''

    characters.forEach(character => {
        if(!separators.includes(character)) {
            token += character
        } else {
            tokens.push(token)
            tokens.push(character)
            token = ''
        }
    })
    tokens.push(token) // push the last token into tokens, since the else condition is never hit

    let currentStartIndex
    let block = {}
    let blockJoined = []
    let currentLastIndex

    // start - handle ` strings
    tokens.forEach((item, index) => {
        if(item.startsWith('`')) {
            currentStartIndex = index
            currentLastIndex = 9999999999
            block[currentStartIndex] = []
        }
        if(index >= currentStartIndex && index <= currentLastIndex) {
            block[currentStartIndex].push(item)
        }
        if(item.endsWith('`')) {
            currentLastIndex = index
            blockJoined.push({
                'startIndex': currentStartIndex,
                'lastIndex': currentLastIndex,
                'mergedString': block[currentStartIndex].join('')
            })
        }
    })

    blockJoined.forEach(item => {
        tokens[item.startIndex] = item.mergedString
    })

    blockJoined.reverse().forEach(item => {
        let i = item.lastIndex
        while(i > item.startIndex) {
            tokens.splice(i, 1)
            i--
        }
    })
    // end - handle `string` strings

    // start - handle 'string' & "string" strings
    blockJoined = []

    tokens.forEach((item, index) => {
        if(item.startsWith('\'') || item.startsWith('"')) {
            currentStartIndex = index
            currentLastIndex = 9999999999
            block[currentStartIndex] = []
        }
        if(index >= currentStartIndex && index <= currentLastIndex) {
            block[currentStartIndex].push(item)
        }
        if(item.endsWith('\'') || item.endsWith('"')) {
            currentLastIndex = index
            blockJoined.push({
                'startIndex': currentStartIndex,
                'lastIndex': currentLastIndex,
                'mergedString': block[currentStartIndex].join('')
            })
        }
    })

    blockJoined.forEach(item => {
        tokens[item.startIndex] = item.mergedString
    })

    blockJoined.reverse().forEach(item => {
        let i = item.lastIndex
        while(i > item.startIndex) {
            tokens.splice(i, 1)
            i--
        }
    })
    // end - handle 'string' & "string" strings

    let tokens2 = []

    tokens.forEach(token => {
        if(separators.includes(token)) {
            tokens2.push({ type: 'Separator', value: token })
        } else if(keywords.includes(token)) {
            tokens2.push({ type: 'Keyword', value: token })
        } else if(token.startsWith('\'') || token.startsWith('"')) {
            tokens2.push({ type: 'String', value: token })
        } else if(token.startsWith('`')) {
            let exportTokens = handleInterpolatedString(token)
            tokens2.push(...exportTokens)
        }else if(/^[0-9]/.test(token)) {
            tokens2.push({ type: 'Number', value: token })
        } else {
            tokens2.push({ type: 'Variable', value: token })
        }
    })

    return tokens2
}

function handleInterpolatedString(string) {
    let characters = string.split('')

    let tokens = []
    let token = ''
    let isString = true

    characters.forEach(character => {
        if(character === '$' || token === '${' || character === '}') {
            if(token === '${') {
                isString = false
            }
            if(isString) {
                tokens.push({ type: 'String', value: token })
            } else {
                if(token === '${') {
                    tokens.push({ type: 'String', value: token })
                } else {
                    tokens.push(...tokenize(token))
                }
            }
            token = ''
            if(character === '}') {
                isString = true
            }
        }
        token += character;
    })
    tokens.push({ type: 'String', value: token })

    return tokens
}