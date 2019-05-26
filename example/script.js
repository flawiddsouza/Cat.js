function cat(){
    return 'hey'
}

new Cat({
    el: '#container',
    data: {
        items: []
    },
    methods: {
        sayHello() {
            alert('hello')
        },
        cat() {
            return 99
        }
    },
    created() {
        for(let i=0; i<=20; i++) {
            this.items.push({
                id: i,
                name: 'Hey ' + i
            })
        }

        // this.sayHello()
    }
})
