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
];

let keywords = ['if', 'else', 'else if'];

function tokenize(string) {
    let characters = string.split('');

    let tokens = [];
    let token = '';

    characters.forEach(character => {
        if(!separators.includes(character)) {
            token += character;
        } else {
            tokens.push(token);
            tokens.push(character);
            token = '';
        }
    });
    tokens.push(token); // push the last token into tokens, since the else condition is never hit

    let currentStartIndex;
    let block = {};
    let blockJoined = [];
    let currentLastIndex;

    // start - handle ` strings
    tokens.forEach((item, index) => {
        if(item.startsWith('`')) {
            currentStartIndex = index;
            currentLastIndex = 9999999999;
            block[currentStartIndex] = [];
        }
        if(index >= currentStartIndex && index <= currentLastIndex) {
            block[currentStartIndex].push(item);
        }
        if(item.endsWith('`')) {
            currentLastIndex = index;
            blockJoined.push({
                'startIndex': currentStartIndex,
                'lastIndex': currentLastIndex,
                'mergedString': block[currentStartIndex].join('')
            });
        }
    });

    blockJoined.forEach(item => {
        tokens[item.startIndex] = item.mergedString;
    });

    blockJoined.reverse().forEach(item => {
        let i = item.lastIndex;
        while(i > item.startIndex) {
            tokens.splice(i, 1);
            i--;
        }
    });
    // end - handle `string` strings

    // start - handle 'string' & "string" strings
    blockJoined = [];

    tokens.forEach((item, index) => {
        if(item.startsWith('\'') || item.startsWith('"')) {
            currentStartIndex = index;
            currentLastIndex = 9999999999;
            block[currentStartIndex] = [];
        }
        if(index >= currentStartIndex && index <= currentLastIndex) {
            block[currentStartIndex].push(item);
        }
        if(item.endsWith('\'') || item.endsWith('"')) {
            currentLastIndex = index;
            blockJoined.push({
                'startIndex': currentStartIndex,
                'lastIndex': currentLastIndex,
                'mergedString': block[currentStartIndex].join('')
            });
        }
    });

    blockJoined.forEach(item => {
        tokens[item.startIndex] = item.mergedString;
    });

    blockJoined.reverse().forEach(item => {
        let i = item.lastIndex;
        while(i > item.startIndex) {
            tokens.splice(i, 1);
            i--;
        }
    });
    // end - handle 'string' & "string" strings

    tokens = tokens.filter(token => token.trim());

    let tokens2 = [];

    tokens.forEach(token => {
        if(separators.includes(token)) {
            tokens2.push({ type: 'Separator', value: token });
        } else if(keywords.includes(token)) {
            tokens2.push({ type: 'Keyword', value: token });
        } else if(token.startsWith('\'') || token.startsWith('"')) {
            tokens2.push({ type: 'String', value: token });
        } else if(token.startsWith('`')) {
            let exportTokens = handleInterpolatedString(token);
            tokens2.push(...exportTokens);
        }else if(/^[0-9]/.test(token)) {
            tokens2.push({ type: 'Number', value: token });
        } else {
            tokens2.push({ type: 'Variable', value: token });
        }
    });

    return tokens2
}

function handleInterpolatedString(string) {
    let characters = string.split('');

    let tokens = [];
    let token = '';
    let isString = true;

    characters.forEach(character => {
        if(character === '$' || token === '${' || character === '}') {
            if(token === '${') {
                isString = false;
            }
            if(isString) {
                tokens.push({ type: 'String', value: token });
            } else {
                if(token === '${') {
                    tokens.push({ type: 'String', value: token });
                } else {
                    tokens.push(...tokenize(token));
                }
            }
            token = '';
            if(character === '}') {
                isString = true;
            }
        }
        token += character;
    });
    tokens.push({ type: 'String', value: token });

    return tokens
}

// let string1 = 'cat() + 1 + ` ${cat()}`'
// console.log(string1 +'\n', tokenize(string1))

class Cat {
    constructor(paramsObject) {

        // handle data
        if(paramsObject.data) {
            for(let key in paramsObject.data) {
                this[key] = paramsObject.data[key];
            }
        }

        // handle methods
        if(paramsObject.methods) {
            for(let key in paramsObject.methods) {
                this[key] = paramsObject.methods[key];
            }
        }

        // handle created()
        if(paramsObject.created) {
            paramsObject.created.call(this);
        }

        document.addEventListener('DOMContentLoaded', () => {

            this.rootElement = document.querySelector(paramsObject.el);

            // handle html > data-loop
            this.handleLoopElements();

            // handle mounted()
            if(paramsObject.mounted) {
                paramsObject.mounted.call(this);
            }

        });

    }

    hideElement(element) {
        element.style.display = 'none';
    }

    handleEcho(expression, element, data=null) {
        let regex = /{{ *(.*?) *}}/g;
        let matches = [...expression.matchAll(regex)].map(item => item[1]);

        matches.forEach(match => {
            let tokens  = tokenize(match);

            let newString = '';

            console.log(tokens);
            tokens.forEach(token => {
                if(token.type === 'Variable') {
                    if(data.hasOwnProperty(token.value)) {
                        newString += 'data.' + token.value;
                    } else if(this.hasOwnProperty(token.value)) {
                        newString += 'this.' + token.value;
                    } else {
                        newString += token.value;
                    }
                } else {
                    newString += token.value;
                }
            });

            let out = eval(newString);

            let escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let regex = new RegExp(`{{.*?${escapedMatch}.*?}}`);
            element.innerHTML = element.innerHTML.replace(regex, out);
        });
    }

    handleLoopElements() {
        var loopElements = Array.from(this.rootElement.querySelectorAll('[data-loop]'));

        loopElements.forEach(loopElement => {

            let parent = loopElement.parentElement;

            let html = '';

            this[loopElement.dataset.loop].forEach(item => {

                let loopElementCopy = loopElement.cloneNode(true);
                delete loopElementCopy.dataset.loop;

                this.handleEcho(loopElement.innerHTML, loopElementCopy, item);

                parent.appendChild(loopElementCopy);

            });

            parent.insertAdjacentHTML('beforeend', html);

            this.hideElement(loopElement);

        });
    }
}

export default Cat;
