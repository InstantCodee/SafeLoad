onmessage = (event) => {
    const data = event.data;
    console.log("New message from main: " + event.data);
    self.postMessage("from worker");
}