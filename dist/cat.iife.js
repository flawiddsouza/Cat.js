var Cat = (function () {
    'use strict';

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
        '<',
        '!'
    ];

    let keywords = [
        'if', 'else', 'else if', 'true', 'false', 'alert', 'console.log',
        '$event',
        '$event.target',
        '$event.target.value',
        'null',
        '||',
        '&&'
    ];

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

            if(paramsObject.hasOwnProperty('name')) {
                this.handleComponent(paramsObject);
                return
            }

            this.parsedExpressions = {};
            this.dataBindings = {};

            this.proxy = new Proxy(this, this.handleDataBindings());

            // handle data
            if(paramsObject.data) {
                for(let key in paramsObject.data) {
                    this[key] = paramsObject.data[key];
                    this.dataBindings[key] = [];
                }
            }

            // handle methods
            if(paramsObject.methods) {
                for(let key in paramsObject.methods) {
                    this[key] = (...args) => paramsObject.methods[key].call(this.proxy, ...args);
                }
            }

            // handle created()
            if(paramsObject.created) {
                paramsObject.created.call(this.proxy);
            }

            document.addEventListener('DOMContentLoaded', () => {

                if(typeof paramsObject.el === 'string') {
                    this.rootElement = document.querySelector(paramsObject.el);
                } else {
                    this.rootElement = paramsObject.el;
                }

                // handle html > data-loop
                this.handleLoopElements();

                // handle html > {{ }}
                this.handleEchoElements();

                // handle html > data-if, data-else-if, data-else
                this.handleConditionalElements();

                // handle html data-on-{event}
                this.handleEventListeners();

                // handle html > data-value
                this.handleDataValueElements();

                // handle mounted()
                if(paramsObject.mounted) {
                    paramsObject.mounted.call(this.proxy);
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
            // if(!this.parsedExpressions.hasOwnProperty(unparsedExpression)) { // removing this reduces performance but enables dataBindings
                let tokens  = tokenize(unparsedExpression);

                let newString = '';

                tokens.forEach(token => {
                    if(token.type === 'Variable') {
                        let tokenValue = token.value.split('.')[0];
                        if(element.loopItem && element.loopItem.hasOwnProperty(tokenValue)) {
                            newString += 'element.loopItem.' + token.value;
                        } else {
                            if(!this.hasOwnProperty(tokenValue)) {
                                console.error(`%c${tokenValue}`, 'font-weight: bold', 'has not been on the instance in ', unparsedExpression);
                                element.parentElement.style.border = '2px solid red';
                                element.parentElement.style.color = 'red';
                                element.parentElement.insertAdjacentHTML('afterbegin', '<b>Error: </b>');
                            } else {
                                if(this.dataBindings.hasOwnProperty(tokenValue) && !this.dataBindings[tokenValue].includes(element)) {
                                    this.dataBindings[tokenValue].push(element);
                                }
                            }
                            newString += 'this.proxy.' + token.value;
                        }
                    } else {
                        newString += token.value;
                    }
                });

                this.parsedExpressions[unparsedExpression] = newString;
            // }

            let result = new Function('element', 'return ' + this.parsedExpressions[unparsedExpression]).call(this, element);

            return result
        }

        handleEcho(unparsedExpression, element) {
            let regex = /{{ *(.*?) *}}/g;
            let matches = [...unparsedExpression.matchAll(regex)].map(item => item[1]);

            if(!element.parentElement.hasOwnProperty('unparsedExpression')) {
                element.parentElement.unparsedExpression = unparsedExpression;
            } else {
                element.nodeValue = element.parentElement.unparsedExpression;
            }

            matches.forEach(match => {
                let out = this.getParsedExpression(match, element);

                let escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let regex = new RegExp(`{{.*?${escapedMatch}.*?}}`);
                element.nodeValue = element.nodeValue.replace(regex, out);
            });
        }

        parseDataLoop(string) {
            let match = string.match(/(.*?) *in * (.*)/);
            let bracketMatch = null;
            if(match[1].startsWith('(')) {
                bracketMatch = match[1].slice(1,-1).split(',');
            }
            return {
                itemVariable: match[1].startsWith('(') ? bracketMatch[0].trim() : match[1].trim(),
                index: match[1].startsWith('(') ? (bracketMatch.hasOwnProperty(1) ? bracketMatch[1].trim() : null) : null,
                accessVariable: match[2].trim()
            }
        }

        handleLoopElement(loopElement) {
            let insertedElement = null;

            if(!loopElement.hasOwnProperty('loopItems')) {
                loopElement.loopItems = [];
            } else {
                loopElement.loopItems.forEach(loopItem => loopItem.remove());
                this.showElement(loopElement);
            }

            let { itemVariable, index, accessVariable } = this.parseDataLoop(loopElement.dataset.loop);

            if(this.dataBindings.hasOwnProperty(accessVariable) && !this.dataBindings[accessVariable].includes(loopElement)) {
                this.dataBindings[accessVariable].push(loopElement);
            }

            this[accessVariable].forEach((item, itemIndex) => {

                item = {
                    [itemVariable]: item,
                    [index]: itemIndex,
                };

                let loopElementCopy = loopElement.cloneNode(true);
                delete loopElementCopy.dataset.loop;

                let textNodesUnderElementCopy = this.textNodesUnder(loopElementCopy);
                textNodesUnderElementCopy.forEach(textNode => {
                    textNode.loopItem = item;
                    textNode.parentElement.loopItem = item;
                    if(textNode.parentElement.parentElement && !textNode.parentElement.parentElement.dataset.hasOwnProperty('data-loop')) {
                        textNode.parentElement.parentElement.loopItem = item; // handles attaching loopItem to upper elements wrapping the textNodes - TODO while loop to attach loopItem to all parentElement of parentElement until that parentElement is a data-loop
                    }
                });

                if(!insertedElement) {
                    loopElement.insertAdjacentElement('afterend', loopElementCopy);
                } else {
                    insertedElement.insertAdjacentElement('afterend', loopElementCopy);
                }

                loopElement.loopItems.push(loopElementCopy);

                insertedElement = loopElementCopy;

            });

            this.hideElement(loopElement);
        }

        handleLoopElements() {
            var loopElements = Array.from(this.rootElement.querySelectorAll('[data-loop]'));

            loopElements.forEach(loopElement => {
                this.handleLoopElement(loopElement);
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

        isParentElementDataLoop(element) {
            if(element && element.parentElement && element.parentElement.dataset.hasOwnProperty('loop')) {
                return true
            } else {
                return false
            }
        }

        handleEchoElements(element=null) {
            if(!element) {
                element = this.rootElement;
            }
            let textNodes = this.textNodesUnder(element, /{{.*?}}/g);
            textNodes = textNodes.filter(textNode => !this.isParentElementDataLoop(textNode)); // exclude loop elements
            textNodes = textNodes.filter(textNode => !this.isParentElementDataLoop(textNode.parentElement)); // exclude loop elements that have nested elements
            textNodes = textNodes.filter(textNode => !this.isParentElementDataLoop(textNode.parentElement.parentElement)); // exclude loop elements that have nested elements inside nested elements
            textNodes.forEach(textNode => {
                this.handleEcho(textNode.nodeValue, textNode);
            });
        }

        handleConditionalElement(ifConditionalElement) {
            if(ifConditionalElement.closest('[data-loop')) { // exclude data-loop and the elements inside it
                return
            }

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
                this.handleDataValueElements(conditionals.if);
            } else {
                let conditionMet = false;

                conditionals.elseIf.forEach(elseIf => {
                    if(!conditionMet && eval(elseIf.dataset.elseIf)) {
                        conditionMet = true;
                        this.showElement(elseIf);
                        this.handleDataValueElements(elseIf);
                    }
                });

                if(!conditionMet && conditionals.else) {
                    conditionMet =  true;
                    this.showElement(conditionals.else);
                    this.handleDataValueElements(conditionals.else);
                }
            }
        }

        handleConditionalElements(element=null) {
            if(!element) {
                element = this.rootElement;
            }
            let ifConditionalElements = element.querySelectorAll('[data-if]');

            ifConditionalElements.forEach(ifConditionalElement => {
                this.handleConditionalElement(ifConditionalElement);
            });
        }

        handleEventListeners(element=null) {
            if(!element) {
                element = this.rootElement;
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
        `);

            eventListeners.forEach(eventListener => {
                let event = Object.keys(eventListener.dataset)[0].replace('on', '').toLowerCase();
                let eventListenerExpression = Object.values(eventListener.dataset)[0];
                eventListener.addEventListener(event, ($event) => {
                    let tokens  = tokenize(eventListenerExpression);

                    let parsedExpression = '';

                    tokens.forEach(token => {
                        if(token.type === 'Variable') {
                            let tokenValue = token.value.split('.')[0];
                            if(eventListener.loopItem && eventListener.loopItem.hasOwnProperty(tokenValue)) {
                                parsedExpression += 'eventListener.loopItem.' + token.value;
                            } else if(this.hasOwnProperty(tokenValue)) {
                                parsedExpression += 'this.proxy.' + token.value;
                            } else {
                                parsedExpression += token.value;
                            }
                        } else {
                            parsedExpression += token.value;
                        }
                    });

                    eval(parsedExpression);
                });
            });
        }

        handleComponent(paramsObject) {
            customElements.define(paramsObject.name, class extends HTMLElement {
                constructor() {
                    super();
                    let shadowElement = this.attachShadow({ mode: 'open' });
                    shadowElement.innerHTML = paramsObject.template;
                }

                connectedCallback() {
                    new Cat({
                        el: this.shadowRoot,
                        data: paramsObject.data,
                        methods: paramsObject.methods,
                        created: paramsObject.created,
                        mounted: paramsObject.mounted
                    });
                }
            });
        }

        handleDataBindings() {
            let _this = this;
            return {
                get(target, prop, receiver) {
                    if(typeof target[prop] === 'object' && target[prop] !== null) {
                        return new Proxy(target[prop], _this.handleDataBindings)
                    } else {
                        return target[prop]
                    }
                },
                set(obj, prop, value) {
                    Reflect.set(...arguments);
                    if(_this.dataBindings.hasOwnProperty(prop)) {
                        _this.dataBindings[prop].forEach(elementToRefresh => {
                            if(elementToRefresh.nodeType === Node.ELEMENT_NODE && elementToRefresh.dataset.hasOwnProperty('value')) {
                                _this.handleDataValueElement(elementToRefresh);
                            } else if(elementToRefresh.nodeType === Node.ELEMENT_NODE && elementToRefresh.dataset.hasOwnProperty('loop')) {
                                _this.handleLoopElement(elementToRefresh);
                                elementToRefresh.loopItems.forEach(loopItem => {
                                    _this.handleEchoElements(loopItem);
                                    _this.handleEventListeners(loopItem);
                                    _this.handleConditionalElements(loopItem);
                                });
                            } else if(elementToRefresh.nodeType === Node.ELEMENT_NODE && elementToRefresh.dataset.hasOwnProperty('if')) {
                                _this.handleConditionalElement(elementToRefresh);
                            } else {
                                _this.handleEcho(elementToRefresh.parentElement.unparsedExpression, elementToRefresh);
                            }
                        });
                    }
                    return true
                }
            }
        }

        static component(paramsObject) {
            new Cat(paramsObject);
        }

        handleDataValueElement(element) {
            let dataIfParent = element.closest('[data-if]');
            if(dataIfParent && dataIfParent.style.display === 'none') { // don't touch data-if elements that are hidden
                return
            }
            element.value = this.getParsedExpression(element.dataset.value, element);
        }

        handleDataValueElements(element=null) {
            if(!element) {
                element = this.rootElement;
            }
            let inputDataValueElements = this.rootElement.querySelectorAll('input[data-value], textarea[data-value]');
            inputDataValueElements.forEach(inputDataValueElement => {
                this.handleDataValueElement(inputDataValueElement);
            });
        }
    }

    return Cat;

}());
