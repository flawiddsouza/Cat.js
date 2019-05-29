import { expect } from 'chai'

import tokenize from '../src/tokenizer'

describe('Tokenizer > tokenize', () => {

    let string1 = 'cat() + 1 + ` ${cat()}`'

    it(string1, () => {

        let tokens = tokenize(string1)

        expect(tokens).to.deep.have.same.members([
            {
                'type': 'Variable',
                'value': 'cat'
            },
            {
                'type': 'Separator',
                'value': '('
            },
            {
                'type': 'Separator',
                'value': ')'
            },
            {
                'type': 'Separator',
                'value': '+'
            },
            {
                'type': 'Number',
                'value': '1'
            },
            {
                'type': 'Separator',
                'value': '+'
            },
            {
                'type': 'String',
                'value': '` '
            },
            {
                'type': 'String',
                'value': '${'
            },
            {
                'type': 'Variable',
                'value': 'cat'
            },
            {
                'type': 'Separator',
                'value': '('
            },
            {
                'type': 'Separator',
                'value': ')'
            },
            {
                'type': 'String',
                'value': '}`'
            }
        ])

    })

    let string2 = '`${ hey() }`'

    it(string2, () => {

        let tokens = tokenize(string2)

        expect(tokens).to.deep.have.same.members([
            {
                'type': 'String',
                'value': '`'
            },
            {
                'type': 'String',
                'value': '${'
            },
            {
                'type': 'Variable',
                'value': 'hey'
            },
            {
                'type': 'Separator',
                'value': '('
            },
            {
                'type': 'Separator',
                'value': ')'
            },
            {
                'type': 'String',
                'value': '}`'
            }
        ])

    })

})
