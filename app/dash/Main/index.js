import React from 'react'
import Restore from 'react-restore'
import { okPort, okProtocol } from '../../../resources/connections'
import link from '../../../resources/link'
import svg from '../../../resources/svg'
import Logo from '../../../asset/png/LogoFull.png'

class Settings extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.customMessage = 'Custom Endpoint'
    const latticeEndpoint = context.store('main.latticeSettings.endpointCustom')
    const latticeEndpointMode = context.store('main.latticeSettings.endpointMode')
    this.state = {
      localShake: {},
      latticeEndpoint,
      latticeEndpointMode,
      resetConfirm: false,
      expandNetwork: false,
      instanceIdHover: false,
      instanceIdCopied: false
    }
  }

  appInfo() {
    // TODO: move this to global passed over IPC
    // eslint-disable-next-line
    const appVersion = require('../../../package.json').version

    return (
      <div className='appInfo'>
        <div className='appInfoLine appInfoLineVersion'>{`v${appVersion}`}</div>
        <div className='appInfoLine appInfoLineReset'>
          {this.state.resetConfirm ? (
            <>
              <span className='appInfoLineResetConfirm'>Are you sure you want to reset everything?</span>
              <span className='appInfoLineResetConfirmButtons'>
                <span
                  className='appInfoLineResetConfirmButton'
                  onClick={() => link.send('tray:resetAllSettings')}
                >
                  Yes
                </span>
                <span> / </span>
                <span
                  className='appInfoLineResetConfirmButton'
                  onClick={() => this.setState({ resetConfirm: false })}
                >
                  No
                </span>
              </span>
            </>
          ) : (
            <span className='appInfoLineResetButton' onClick={() => this.setState({ resetConfirm: true })}>
              Reset All Settings & Data
            </span>
          )}
        </div>
      </div>
    )
  }

  customPrimaryFocus() {
    if (this.state.primaryCustom === this.customMessage) this.setState({ primaryCustom: '' })
  }

  customPrimaryBlur() {
    if (this.state.primaryCustom === '') this.setState({ primaryCustom: this.customMessage })
  }

  inputPrimaryCustom(e) {
    e.preventDefault()
    clearTimeout(this.customPrimaryInputTimeout)
    const value = e.target.value.replace(/\s+/g, '')
    this.setState({ primaryCustom: value })
    const { type, id } = this.store('main.currentNetwork')
    this.customPrimaryInputTimeout = setTimeout(
      () => link.send('tray:action', 'setPrimaryCustom', type, id, this.state.primaryCustom),
      1000
    )
  }

  inputSecondaryCustom(e) {
    e.preventDefault()
    clearTimeout(this.customSecondaryInputTimeout)
    const value = e.target.value.replace(/\s+/g, '')
    this.setState({ secondaryCustom: value })
    const { type, id } = this.store('main.currentNetwork')
    this.customSecondaryInputTimeout = setTimeout(
      () => link.send('tray:action', 'setSecondaryCustom', type, id, this.state.secondaryCustom),
      1000
    )
  }

  inputLatticeEndpoint(e) {
    e.preventDefault()
    clearTimeout(this.inputLatticeTimeout)
    const value = e.target.value.replace(/\s+/g, '')
    this.setState({ latticeEndpoint: value })
    // TODO: Update to target specific Lattice device rather than global
    this.inputLatticeTimeout = setTimeout(
      () => link.send('tray:action', 'setLatticeEndpointCustom', this.state.latticeEndpoint),
      1000
    )
  }

  localShake(key) {
    const localShake = Object.assign({}, this.state.localShake)
    localShake[key] = true
    this.setState({ localShake })
    setTimeout(() => {
      const localShake = Object.assign({}, this.state.localShake)
      localShake[key] = false
      this.setState({ localShake })
    }, 1010)
  }

  status(layer) {
    const { type, id } = this.store('main.currentNetwork')
    const connection = this.store('main.networks', type, id, 'connection', layer)
    let status = connection.status
    const current = connection.current

    if (current === 'custom') {
      if (
        layer === 'primary' &&
        this.state.primaryCustom !== '' &&
        this.state.primaryCustom !== this.customMessage
      ) {
        if (!okProtocol(this.state.primaryCustom)) status = 'invalid target'
        else if (!okPort(this.state.primaryCustom)) status = 'invalid port'
      }

      if (
        layer === 'secondary' &&
        this.state.secondaryCustom !== '' &&
        this.state.secondaryCustom !== this.customMessage
      ) {
        if (!okProtocol(this.state.secondaryCustom)) status = 'invalid target'
        else if (!okPort(this.state.secondaryCustom)) status = 'invalid port'
      }
    }
    if (status === 'connected' && !connection.network) status = 'loading'
    return (
      <div className='connectionOptionStatus'>
        {this.indicator(status)}
        <div className='connectionOptionStatusText'>{status}</div>
      </div>
    )
  }

  discord() {
    return (
      <div
        className='discordInvite'
        onClick={() => link.send('tray:openExternal', 'https://evotrade.io')}
      >
        <div>Need help?</div>
        <div className='discordLink'>Join our Community!</div>
      </div>
    )
  }

  quit() {
    return (
      <div className='addCustomTokenButtonWrap quitFrame' style={{ zIndex: 215 }}>
        <div className='addCustomTokenButton' onClick={() => link.send('tray:quit')}>
          Quit
        </div>
      </div>
    )
  }

  indicator(status) {
    if (status === 'connected') {
      return (
        <div className='connectionOptionStatusIndicator'>
          <div className='connectionOptionStatusIndicatorGood' />
        </div>
      )
    } else if (status === 'loading' || status === 'syncing' || status === 'pending' || status === 'standby') {
      return (
        <div className='connectionOptionStatusIndicator'>
          <div className='connectionOptionStatusIndicatorPending' />
        </div>
      )
    } else {
      return (
        <div className='connectionOptionStatusIndicator'>
          <div className='connectionOptionStatusIndicatorBad' />
        </div>
      )
    }
  }

  selectNetwork(network) {
    const [type, id] = network.split(':')
    if (network.type !== type || network.id !== id) link.send('tray:action', 'selectNetwork', type, id)
  }

  expandNetwork(e, expand) {
    e.stopPropagation()
    this.setState({ expandNetwork: expand !== undefined ? expand : !this.state.expandNetwork })
  }

  render() {
    const networks = this.store('main.networks')
    const networkOptions = []

    Object.keys(networks).forEach((type) => {
      Object.keys(networks[type]).forEach((id) => {
        networkOptions.push({ text: networks[type][id].name, value: type + ':' + id })
      })
    })
    return (
      <div className={'localSettings cardShow'}>
        <div className='localSettingsWrap'>
          <div className='logoImageContainer'>
            <img
              src={Logo}
              alt='EvoTradeWallet'
              className='logoImage'
            />
          </div>

          <div className='dashModules'>
            <div
              className='dashModule'
              onClick={() => link.send('tray:action', 'navDash', { view: 'accounts', data: {} })}
            >
              <div className='dashModuleContainer'>
                <div className='dashModuleIcon'>{svg.accounts(20)}</div>
                <div className='dashModuleTitle'>{'Accounts'}</div>
              </div>

              <div className='dashModuleIcon'>{svg.rightarrow(14)}</div>
            </div>

            <div
              className='dashModule'
              onClick={() => link.send('tray:action', 'navDash', { view: 'chains', data: {} })}
            >
              <div className='dashModuleContainer'>
                <div className='dashModuleIcon'>{svg.chain(20)}</div>
                <div className='dashModuleTitle'>{'Chains'}</div>
              </div>

              <div className='dashModuleIcon'>{svg.rightarrow(14)}</div>
            </div>

            <div
              className='dashModule'
              onClick={() => link.send('tray:action', 'navDash', { view: 'tokens', data: {} })}
            >
              <div className='dashModuleContainer'>
                <div className='dashModuleIcon'>{svg.tokens(20)}</div>
                <div className='dashModuleTitle'>{'Tokens'}</div>
              </div>

              <div className='dashModuleIcon'>{svg.rightarrow(14)}</div>
            </div>

            <div
              className='dashModule'
              onClick={() => link.send('tray:action', 'navDash', { view: 'dapps', data: {} })}
            >
              <div className='dashModuleContainer'>
                <div className='dashModuleIcon'>{svg.window(20)}</div>
                <div className='dashModuleTitle'>{'Dapps'}</div>
              </div>

              <div className='dashModuleIcon'>{svg.rightarrow(14)}</div>
            </div>

            <div
              className='dashModule'
              onClick={() => link.send('tray:action', 'navDash', { view: 'settings', data: {} })}
            >
              <div className='dashModuleContainer'>
                <div className='dashModuleIcon'>{svg.settings(20)}</div>
                <div className='dashModuleTitle'>{'Settings'}</div>
              </div>

              <div className='dashModuleIcon'>{svg.rightarrow(14)}</div>
            </div>
          </div>

          <div className='snipIt'>
            <div>Using a dapp that doesn&apos;t support EvoTradeWallet natively?</div>
            <div>Inject a connection with our browser extension!</div>
          </div>

          <div className='requestFeature'>
            <div
              className='requestFeatureButton'
              onClick={() => {
                link.send('tray:openExternal', 'https://evotrade.io')
              }}
            >
              Request a Feature
            </div>
          </div>
          <div className='requestFeature'>
            <div
              className='requestFeatureButton'
              onClick={() => {
                link.send('tray:action', 'setOnboard', { showing: true })
              }}
            >
              Open EvoTradeWallet Tutorial
            </div>
          </div>
          <div className='requestFeature'>
            <div
              className='requestFeatureButton'
              onClick={() => {
                link.send('tray:quit')
              }}
            >
              Quit
            </div>
          </div>
          {this.appInfo()}
        </div>
      </div>
    )
  }
}

export default Restore.connect(Settings)
