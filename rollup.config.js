import pkg from './package.json';

export default [{
    input: 'src/cat.js',
    output: [
        {
            file: pkg.browser,
            name: 'Cat',
			format: 'iife'
        },
        {
            file: pkg.module,
			format: 'esm'
        }
    ]
}]
