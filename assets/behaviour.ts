import 'bootstrap'

if (process.env.NODE_ENV === 'development') {
  const parcelSocket = new WebSocket('ws://localhost:1234/')
  parcelSocket.onmessage = () => {
    setTimeout(() => {
      location.reload()
    }, 2000)
  }
}
