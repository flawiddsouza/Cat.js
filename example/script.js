function cat2(){
    return 'Hello!'
}

new Cat({
    el: '#container',
    data: {
        items: []
    },
    methods: {
        sayHello() {
            console.log(this.cat2())
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
