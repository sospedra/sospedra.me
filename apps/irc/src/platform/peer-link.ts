import { ICE_GATHER_TIMEOUT_MS, STUN_SERVERS } from '../mesh/constants.ts'

const RTC_CONFIG: RTCConfiguration = {
  iceServers: STUN_SERVERS.map((urls) => ({ urls })),
}

const gathered = (pc: RTCPeerConnection): Promise<void> =>
  new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve()
    const timer = setTimeout(resolve, ICE_GATHER_TIMEOUT_MS)
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState !== 'complete') return
      clearTimeout(timer)
      resolve()
    })
  })

export const createOfferPeer = async (): Promise<{
  pc: RTCPeerConnection
  dc: RTCDataChannel
  sdp: string
}> => {
  const pc = new RTCPeerConnection(RTC_CONFIG)
  const dc = pc.createDataChannel('mesh')
  dc.binaryType = 'arraybuffer'
  await pc.setLocalDescription(await pc.createOffer())
  await gathered(pc)
  return { pc, dc, sdp: pc.localDescription?.sdp ?? '' }
}

export const createAnswerPeer = async (
  offerSdp: string,
): Promise<{
  pc: RTCPeerConnection
  sdp: string
  channel: Promise<RTCDataChannel>
}> => {
  const pc = new RTCPeerConnection(RTC_CONFIG)
  const channel = new Promise<RTCDataChannel>((resolve) => {
    pc.addEventListener('datachannel', (event) => {
      event.channel.binaryType = 'arraybuffer'
      resolve(event.channel)
    })
  })
  await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp })
  await pc.setLocalDescription(await pc.createAnswer())
  await gathered(pc)
  return { pc, sdp: pc.localDescription?.sdp ?? '', channel }
}

export const acceptAnswer = (
  pc: RTCPeerConnection,
  answerSdp: string,
): Promise<void> => pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

type LinkHandlers = {
  onMessage(peerHex: string, bytes: Uint8Array): void
  onClose(peerHex: string): void
}

export class PeerLink {
  readonly peerHex: string
  readonly offererHex: string
  lastSeenMs: number
  private readonly pc: RTCPeerConnection
  private readonly dc: RTCDataChannel
  private closed = false
  private readonly handlers: LinkHandlers

  constructor(input: {
    peerHex: string
    offererHex: string
    pc: RTCPeerConnection
    dc: RTCDataChannel
    nowMs: number
    handlers: LinkHandlers
  }) {
    this.peerHex = input.peerHex
    this.offererHex = input.offererHex
    this.pc = input.pc
    this.dc = input.dc
    this.lastSeenMs = input.nowMs
    this.handlers = input.handlers
    this.dc.addEventListener('message', (event) => {
      this.lastSeenMs = Date.now()
      const data = event.data as ArrayBuffer
      this.handlers.onMessage(this.peerHex, new Uint8Array(data))
    })
    this.dc.addEventListener('close', () => this.close())
    this.pc.addEventListener('connectionstatechange', () => {
      if (this.pc.connectionState === 'failed') this.close()
    })
  }

  get bufferedAmount(): number {
    return this.dc.readyState === 'open' ? this.dc.bufferedAmount : 0
  }

  send(bytes: Uint8Array): boolean {
    if (this.dc.readyState !== 'open') return false
    this.dc.send(bytes as Uint8Array<ArrayBuffer>)
    return true
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.dc.close()
    this.pc.close()
    this.handlers.onClose(this.peerHex)
  }
}
