new Cat({
    el: '#container',
    data: {
        items: []
    },
    methods: {
        sayHello() {
            alert('hello')
        }
    },
    created() {
        for(let i=0; i<=100; i++) {
            this.items.push({
                id: i,
                name: 'Hey ' + i
            })
        }

        // this.sayHello()
    }
})