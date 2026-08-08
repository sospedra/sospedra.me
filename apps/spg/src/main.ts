import './style.css'

import { setupGenerator } from './app.ts'
import { setupClipboard } from './clipboard.ts'
import { setupHelp } from './help.ts'

setupClipboard()
setupGenerator()
setupHelp()
