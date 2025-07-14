import { render } from 'preact'
import App from './App'
import { registerSW } from 'virtual:pwa-register'


registerSW()
render(<App />, document.getElementById('app'))
