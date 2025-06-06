import { app, ipcMain, protocol, clipboard, powerMonitor, BrowserWindow } from 'electron'
import path from 'path'
import log from 'electron-log'
import url from 'url'

// DO NOT MOVE - env var below is required for app init and must be set before all local imports
process.env.BUNDLE_LOCATION = process.env.BUNDLE_LOCATION || path.resolve(__dirname, './../..', 'bundle')

import * as errors from './errors'
import windows from './windows'
import menu from './menu'
import store from './store'
import dapps from './dapps'
import accounts from './accounts'
import * as launch from './launch'
import updater from './updater'
import signers from './signers'
import persist from './store/persist'
import { showUnhandledExceptionDialog } from './windows/dialog'
import { openBlockExplorer, openExternal } from './windows/window'
import { FrameInstance } from './windows/frames/frameInstances'
import Erc20Contract from './contracts/erc20'
import { getErrorCode } from '../resources/utils'

app.commandLine.appendSwitch('enable-accelerated-2d-canvas', 'true')
app.commandLine.appendSwitch('enable-gpu-rasterization', 'true')
app.commandLine.appendSwitch('force-gpu-rasterization', 'true')
app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true')
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers', 'true')
app.commandLine.appendSwitch('force-color-profile', 'srgb')

const isDev = process.env.NODE_ENV === 'development'
log.transports.console.level = process.env.LOG_LEVEL || (isDev ? 'verbose' : 'info')

if (process.env.LOG_LEVEL === 'debug') {
  log.transports.file.level = 'debug'
  log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/debug.log')
} else {
  log.transports.file.level = ['development', 'test'].includes(process.env.NODE_ENV) ? false : 'verbose'
}

const hasInstanceLock = app.requestSingleInstanceLock()

if (!hasInstanceLock) {
  log.info('another instance of EvoTradeWallet is running - exiting...')
  app.exit(1)
}

require('./rpc')
errors.init()

log.info(`Chrome: v${process.versions.chrome}`)
log.info(`Electron: v${process.versions.electron}`)
log.info(`Node: v${process.versions.node}`)

// prevent showing the exit dialog more than once
let closing = false

process.on('uncaughtException', (e) => {
  log.error('Uncaught Exception!', e)

  const errorCode = getErrorCode(e) ?? ''

  if (errorCode === 'EPIPE') {
    log.error('uncaught EPIPE error', e)
    return
  }

  if (!closing) {
    closing = true

    showUnhandledExceptionDialog(e.message, errorCode)
  }
})

process.on('unhandledRejection', (e) => {
  log.error('Unhandled Rejection!', e)
})

function startUpdater() {
  powerMonitor.on('resume', () => {
    log.debug('System resuming, starting updater')

    updater.start()
  })

  powerMonitor.on('suspend', () => {
    log.debug('System suspending, stopping updater')

    updater.stop()
  })

  updater.start()
}

global.eval = () => {
  throw new Error(`This app does not support global.eval()`)
} // eslint-disable-line

ipcMain.on('tray:resetAllSettings', () => {
  persist.clear()

  if (updater.updateReady) {
    return updater.quitAndInstall()
  }

  app.relaunch()
  app.exit(0)
})

ipcMain.on('tray:replaceTx', async (e, id, type) => {
  store.navBack('panel')
  setTimeout(async () => {
    try {
      await accounts.replaceTx(id, type)
    } catch (e) {
      log.error('tray:replaceTx Error', e)
    }
  }, 1000)
})

ipcMain.on('tray:clipboardData', (e, data) => {
  if (data) clipboard.writeText(data)
})

ipcMain.on('tray:installAvailableUpdate', () => {
  store.updateBadge('')

  updater.fetchUpdate()
})

ipcMain.on('tray:dismissUpdate', (e, version, remind) => {
  if (!remind) {
    store.dontRemind(version)
  }

  store.updateBadge('')

  updater.dismissUpdate()
})

ipcMain.on('tray:removeAccount', (e, id) => {
  accounts.remove(id)
})

ipcMain.on('tray:renameAccount', (e, id, name) => {
  accounts.rename(id, name)
})

ipcMain.on('dash:removeSigner', (e, id) => {
  signers.remove(id)
})

ipcMain.on('dash:reloadSigner', (e, id) => {
  signers.reload(id)
})

ipcMain.on('tray:resolveRequest', (e, req, result) => {
  accounts.resolveRequest(req, result)
})

ipcMain.on('tray:rejectRequest', (e, req) => {
  const err = { code: 4001, message: 'User rejected the request' }
  accounts.rejectRequest(req, err)
})

ipcMain.on('tray:clearRequestsByOrigin', (e, account, origin) => {
  accounts.clearRequestsByOrigin(account, origin)
})

ipcMain.on('tray:openExternal', (e, url) => {
  openExternal(url)
  store.setDash({ showing: false })
})

ipcMain.on('tray:openExplorer', (e, chain, hash, account) => {
  openBlockExplorer(chain, hash, account)
})

ipcMain.on('tray:copyTxHash', (e, hash) => {
  if (hash) clipboard.writeText(hash)
})

ipcMain.on('tray:giveAccess', (e, req, access) => {
  accounts.setAccess(req, access)
})

ipcMain.on('tray:addChain', (e, chain) => {
  store.addNetwork(chain)
})

ipcMain.on('tray:switchChain', (e, type, id, req) => {
  if (type && id) store.selectNetwork(type, id)
  accounts.resolveRequest(req)
})

ipcMain.handle('tray:getTokenDetails', async (e, contractAddress, chainId) => {
  try {
    const contract = new Erc20Contract(contractAddress, chainId)
    return await contract.getTokenData()
  } catch (e) {
    log.warn('Could not load token data for contract', { contractAddress, chainId })
    return {}
  }
})

ipcMain.on('tray:addToken', (e, token, req) => {
  if (token) {
    log.info('adding custom token', token)
    store.addCustomTokens([token])
  }
  if (req) accounts.resolveRequest(req)
})

ipcMain.on('tray:removeToken', (e, token) => {
  if (token) {
    log.info('removing custom token', token)

    store.removeBalance(token.chainId, token.address)
    store.removeCustomTokens([token])
  }
})

ipcMain.on('tray:adjustNonce', (e, handlerId, nonceAdjust) => {
  accounts.adjustNonce(handlerId, nonceAdjust)
})

ipcMain.on('tray:resetNonce', (e, handlerId) => {
  accounts.resetNonce(handlerId)
})

ipcMain.on('tray:removeOrigin', (e, handlerId) => {
  accounts.removeRequests(handlerId)
  store.removeOrigin(handlerId)
})

ipcMain.on('tray:clearOrigins', () => {
  Object.keys(store('main.origins')).forEach((handlerId) => {
    accounts.removeRequests(handlerId)
  })
  store.clearOrigins()
})

ipcMain.on('tray:syncPath', (e, path, value) => {
  store.syncPath(path, value)
})

ipcMain.on('tray:ready', () => {
  require('./api')

  if (!isDev) {
    startUpdater()
  }
})

ipcMain.on('tray:updateRestart', () => {
  updater.quitAndInstall()
})

ipcMain.on('frame:close', (e) => {
  windows.close(e)
})

ipcMain.on('frame:min', (e) => {
  windows.min(e)
})

ipcMain.on('frame:max', (e) => {
  windows.max(e)
})

ipcMain.on('frame:unmax', (e) => {
  windows.unmax(e)
})

dapps.add({
  ens: 'send.frame.eth',
  checkStatusRetryCount: 0,
  openWhenReady: false,
  config: {
    key: 'value'
  },
  status: 'initial'
})

ipcMain.on('unsetCurrentView', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender) as FrameInstance
  dapps.unsetCurrentView(win.frameId as string)
})

ipcMain.on('*:addFrame', (e, id) => {
  const existingFrame = store('main.frames', id)

  if (existingFrame) {
    windows.refocusFrame(id)
  } else {
    store.addFrame({
      id,
      currentView: '',
      views: {}
    })
    dapps.open(id, 'send.frame.eth')
  }
})

app.on('ready', () => {
  menu()
  windows.init()
  if (app.dock) app.dock.hide()
  if (isDev) {
    const loadDev = async () => {
      const { installDevTools, startCpuMonitoring } = await import('./dev')
      installDevTools()
      startCpuMonitoring()
    }

    void loadDev()
  }

  protocol.interceptFileProtocol('file', (req, cb) => {
    const appOrigin = path.resolve(__dirname, '../../')
    const filePath = url.fileURLToPath(req.url)

    if (filePath.startsWith(appOrigin)) cb({ path: filePath }) // eslint-disable-line
  })
})

ipcMain.on('tray:action', (e, action, ...args) => {
  if (store[action]) return store[action](...args)
  log.info('Tray sent unrecognized action: ', action)
})

app.on('second-instance', (event, argv, workingDirectory) => {
  log.info(`second instance requested from directory: ${workingDirectory}`)
  windows.showTray()
})
app.on('activate', () => windows.showTray())

app.on('before-quit', () => {
  if (!updater.updateReady) {
    updater.stop()
  }
})

app.on('will-quit', () => app.quit())
app.on('quit', () => {
  log.info('Application closing')

  // await clients.stop()
  accounts.close()
  signers.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

let launchStatus = store('main.launch')

store.observer(() => {
  if (launchStatus !== store('main.launch')) {
    launchStatus = store('main.launch')
    launchStatus ? launch.enable() : launch.disable()
  }
})
