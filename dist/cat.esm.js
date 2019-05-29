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
    ')',
    '>',
    '<'
];

let keywords = ['if', 'else', 'else if', 'true', 'false'];

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
        let started = false;
        if(item.startsWith('`')) {
            currentStartIndex = index;
            currentLastIndex = 9999999999;
            block[currentStartIndex] = [];
            started = true;
        }
        if(index >= currentStartIndex && index <= currentLastIndex) {
            block[currentStartIndex].push(item);
        }
        if(!started && item.endsWith('`')) {
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
        let started = false;
        if(item.startsWith('\'') || item.startsWith('"')) {
            currentStartIndex = index;
            currentLastIndex = 9999999999;
            block[currentStartIndex] = [];
            started = true;
        }
        if(index >= currentStartIndex && index <= currentLastIndex) {
            block[currentStartIndex].push(item);
        }
        if(!started && (item.endsWith('\'') || item.endsWith('"'))) {
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

            // handle html > {{ }}
            this.handleEchoElements();

            // handle html > data-if, data-else-if, data-else
            this.handleConditionalElements();

            // handle mounted()
            if(paramsObject.mounted) {
                paramsObject.mounted.call(this);
            }

        });

    }

    hideElement(element) {
        element.style.display = 'none';
    }

    showElement(element) {
        element.style.display = '';
    }

    getParsedExpression(unparsedExpression, element) {
        let tokens  = tokenize(unparsedExpression);

        let newString = '';

        tokens.forEach(token => {
            if(token.type === 'Variable') {
                if(element.loopItem && element.loopItem.hasOwnProperty(token.value)) {
                    newString += 'element.loopItem.' + token.value;
                } else {
                    if(!this.hasOwnProperty(token.value)) {
                        console.error(`%c${token.value}`, 'font-weight: bold', 'has not been on the instance in ', unparsedExpression);
                        element.parentElement.style.border = '2px solid red';
                        element.parentElement.style.color = 'red';
                        element.parentElement.insertAdjacentHTML('afterbegin', '<b>Error: </b>');
                    }
                    newString += 'this.' + token.value;
                }
            } else {
                newString += token.value;
            }
        });

        return eval(newString)
    }

    handleEcho(unparsedExpression, element) {
        let regex = /{{ *(.*?) *}}/g;
        let matches = [...unparsedExpression.matchAll(regex)].map(item => item[1]);

        matches.forEach(match => {
            let out = this.getParsedExpression(match, element);

            let escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let regex = new RegExp(`{{.*?${escapedMatch}.*?}}`);
            element.nodeValue = element.nodeValue.replace(regex, out);
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

                loopElementCopy.childNodes[0].loopItem = item;

                parent.appendChild(loopElementCopy);

            });

            parent.insertAdjacentHTML('beforeend', html);

            // loopElement.remove()
            this.hideElement(loopElement);

        });
    }

    textNodesUnder(element, match=null) {
        let n;
        let textNodes = [];
        let walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        while(n=walk.nextNode()) {
            textNodes.push(n);
        }
        if(match) {
            textNodes = textNodes.filter(textNode => textNode.nodeValue.match(match));
        }
        return textNodes
    }

    handleEchoElements() {
        let textNodes = this.textNodesUnder(this.rootElement, /{{.*?}}/g);
        textNodes = textNodes.filter(textNode => !textNode.parentElement.dataset.loop); // exclude loop elements
        textNodes.forEach(textNode => {
            this.handleEcho(textNode.nodeValue, textNode);
        });
    }

    handleConditionalElements() {
        let ifConditionalElements = this.rootElement.querySelectorAll('[data-if]');

        ifConditionalElements.forEach(ifConditionalElement => {
            let conditionals = {};

            conditionals['if'] = ifConditionalElement;
            this.hideElement(ifConditionalElement);
            conditionals['elseIf'] = [];

            let nextElementSibling =  ifConditionalElement.nextElementSibling;

            while(nextElementSibling) {
                if(nextElementSibling.dataset.hasOwnProperty('elseIf')) {
                    this.hideElement(nextElementSibling);
                    conditionals['elseIf'].push(nextElementSibling);
                    nextElementSibling = nextElementSibling.nextElementSibling;
                } else if(nextElementSibling.dataset.hasOwnProperty('else')) {
                    this.hideElement(nextElementSibling);
                    conditionals['else'] = nextElementSibling;
                    nextElementSibling = null;
                } else {
                    nextElementSibling = null;
                }
            }

            let parsedIfCondition = this.getParsedExpression(conditionals.if.dataset.if, conditionals.if);
            parsedIfCondition = eval(parsedIfCondition);

            if(parsedIfCondition) {
                this.showElement(conditionals.if);
            } else {
                let conditionMet = false;

                conditionals.elseIf.forEach(elseIf => {
                    if(!conditionMet && eval(elseIf.dataset.elseIf)) {
                        conditionMet = true;
                        this.showElement(elseIf);
                    }
                });

                if(!conditionMet && conditionals.else) {
                    conditionMet =  true;
                    this.showElement(conditionals.else);
                }
            }
        });
    }
}

export default Cat;
