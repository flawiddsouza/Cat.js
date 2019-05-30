function cat2(){
    return 'Hello!'
}

new Cat({
    name: 'hello-world',
    template: `
        <div>{{ message }}<br><button data-on-click="consoleLogMessage()">consoleLogMessage</button></div>
    `,
    data: {
        message: 'Hello World'
    },
    methods: {
        consoleLogMessage() {
            console.log(this.message)
        }
    }
})

new Cat({
    el: '#container',
    data: {
        items: []
    },
    methods: {
        sayHello(event) {
            console.log(event, this.cat2())
        },
        cat() {
            return 99
        },
        cat2
    },
    created() {
        for(let i=0; i<=20; i++) {
            this.items.push({
                id: i,
                name: 'Hey ' + i
            })
        }

        this.sayHello()
    }
})
