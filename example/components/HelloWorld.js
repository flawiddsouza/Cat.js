const HelloWorld = {
    name: 'hello-world',
    template: `
        <style>
            div {
                padding: 1em;
                background-color: lightgreen;
                border: 1px solid black
            }
            div {
                margin-top: 1em
            }
        </style>
        <div>Counter: {{ counter }}<br><slot name="test"></slot><br><button data-on-click="counterPlus1()">+1</button></div>
    `,
    data: {
        counter: 0
    },
    methods: {
        counterPlus1() {
            this.counter++
        }
    }
}
