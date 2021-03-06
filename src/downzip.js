import registerServiceWorker from 'service-worker-loader!./downzip-sw'

const SCOPE = 'downzip'
const TIMEOUT_MS = 5000
const KEEPALIVE_INTERVAL_MS = 5000

class DownZip {
    constructor(){
        this.worker = null

        // Register service worker and let it intercept our scope
        registerServiceWorker({
            scope: `./${SCOPE}/`
        }).then(result => {
            console.log('[DownZip] Service worker registered successfully:', result)
            this.worker = result.installing || result.active
        }).catch(error => {
            console.error('[DownZip] Service workers not loaded:', error)
        })

        // Start keep-alive timer
        setInterval(async () => {
            this.sendMessage('TICK')
        }, KEEPALIVE_INTERVAL_MS)
    }

    sendMessage(command, data, port){
        this.worker.postMessage({
            command,
            data
        }, port ? [port] : undefined)
    }

    // Files array is in the following format: [{name: '', url: ''}, ...]
    async downzip(id, name, files){
        // Check if worker got created in the constructor
        if(!this.worker){
            console.error("[DownZip] No service worker registered!")
            return
        }

        return new Promise(((resolve, reject) => {
            // Return download URL on acknowledge via messageChannel
            const messageChannel = new MessageChannel()
            messageChannel.port1.addEventListener('message', () => resolve(`${SCOPE}/download-${id}`))
            messageChannel.port1.start()

            // Init this task in our service worker
            this.sendMessage('INITIALIZE', {
                id,
                files,
                name
            }, messageChannel.port2)

            // Start timeout timer
            setTimeout(reject, TIMEOUT_MS)
        }))
    }
}

export default DownZip