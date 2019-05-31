function cat2(){
    return 'Hello!'
}

Cat.component(HelloWorld)

new Cat({
    el: '#container',
    data: {
        items: [],
        test: 'aaa',
        counter: 0,
        inputTest: 'Test'
    },
    methods: {
        sayHello(event) {
            console.log(event, this.cat2())
        },
        cat() {
            return 99
        },
        cat2,
        counterAdd1() {
            this.counter++
        }
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
