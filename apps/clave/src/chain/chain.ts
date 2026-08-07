// The settlement layer, paper Section 7.
//
// One interface, two backings. The mock runs in memory and costs nothing, so
// the whole protocol can be exercised in tests and in development without
// spending gas. The Gnosis backing talks to a real node.
//
// Nothing above this file knows which one it has. That is the point: if the
// protocol logic could tell, the mock would not be proving anything about the
// real path.

export type TxRef = { readonly hash: string; readonly blockNumber: number }

export type UnsealRequest = {
  // Hides which account. Paper Section 3.8 step 1.
  readonly commitment: string
  // Binds the stated reason at request time so it cannot be revised later.
  readonly reasonHash: string
  readonly requesterPubKey: string
}

export type ObservedRequest = UnsealRequest & {
  readonly tx: TxRef
  readonly confirmations: number
}

export type Chain = {
  readonly kind: 'mock' | 'gnosis'
  /** Anchor a transparency record root. Batched, so this is not per user. */
  anchor(root: string): Promise<TxRef>
  /** Post an unseal request. One per unseal, never batched. */
  postRequest(request: UnsealRequest): Promise<TxRef>
  /** Every request at or beyond the given confirmation depth. */
  observeRequests(minConfirmations: number): Promise<ObservedRequest[]>
  /** Confirmations behind a transaction, or 0 if unknown. */
  confirmations(tx: TxRef): Promise<number>
  tipHeight(): Promise<number>
}

// ---------------------------------------------------------------------------

type MockEntry = { request: UnsealRequest; tx: TxRef }

export type MockChainOptions = {
  /** Blocks mined per submitted transaction. Gnosis produces one about every
   *  five seconds, so a test wanting realistic depth growth can raise this. */
  readonly blocksPerTx?: number
}

export class MockChain implements Chain {
  readonly kind = 'mock' as const
  private height = 0
  private nonce = 0
  private readonly requests: MockEntry[] = []
  private readonly anchors: { root: string; tx: TxRef }[] = []
  private readonly blocksPerTx: number

  constructor(options: MockChainOptions = {}) {
    this.blocksPerTx = options.blocksPerTx ?? 1
  }

  private mine(): TxRef {
    this.height += this.blocksPerTx
    this.nonce++
    return {
      hash: `0xmock${this.nonce.toString(16).padStart(60, '0')}`,
      blockNumber: this.height,
    }
  }

  /** Advance the chain without submitting anything, so a test can reach a
   *  confirmation depth without inventing traffic. */
  advance(blocks: number): void {
    this.height += blocks
  }

  async anchor(root: string): Promise<TxRef> {
    const tx = this.mine()
    this.anchors.push({ root, tx })
    return tx
  }

  async postRequest(request: UnsealRequest): Promise<TxRef> {
    const tx = this.mine()
    this.requests.push({ request, tx })
    return tx
  }

  async observeRequests(minConfirmations: number): Promise<ObservedRequest[]> {
    return this.requests
      .map((entry) => ({
        ...entry.request,
        tx: entry.tx,
        confirmations: this.height - entry.tx.blockNumber,
      }))
      .filter((entry) => entry.confirmations >= minConfirmations)
  }

  async confirmations(tx: TxRef): Promise<number> {
    return Math.max(0, this.height - tx.blockNumber)
  }

  async tipHeight(): Promise<number> {
    return this.height
  }

  /** Mock-only. Lets a test assert that anchoring happened without reaching
   *  into a real node. */
  anchoredRoots(): string[] {
    return this.anchors.map((a) => a.root)
  }
}

// ---------------------------------------------------------------------------

export type GnosisOptions = {
  readonly rpcUrl: string
  readonly contractAddress: string
  /** Omit for read-only use. Required to post. */
  readonly privateKey?: string
}

// Real Gnosis Chain. Deliberately thin: it speaks JSON-RPC directly rather than
// pulling in a client library, because the surface used here is four calls and
// a dependency on this path would have to be audited.
//
// Writing requires a funded key and is left unimplemented until a deployment
// names a contract. Reading works today against any public RPC endpoint, which
// is enough to check that the mock and the real chain agree about heights and
// confirmations.
export class GnosisChain implements Chain {
  readonly kind = 'gnosis' as const

  private readonly options: GnosisOptions

  constructor(options: GnosisOptions) {
    this.options = options
  }

  private async rpc(method: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(this.options.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    if (!response.ok) {
      throw new Error(`gnosis rpc ${method}: http ${response.status}`)
    }
    const body = (await response.json()) as {
      result?: unknown
      error?: { message: string }
    }
    if (body.error)
      throw new Error(`gnosis rpc ${method}: ${body.error.message}`)
    return body.result
  }

  async tipHeight(): Promise<number> {
    return Number(await this.rpc('eth_blockNumber', []))
  }

  async confirmations(tx: TxRef): Promise<number> {
    return Math.max(0, (await this.tipHeight()) - tx.blockNumber)
  }

  async anchor(_root: string): Promise<TxRef> {
    throw new Error(
      'refused: writing to Gnosis needs a funded key and a deployed contract. ' +
        'Set CLAVE_CHAIN=mock to iterate without spending.',
    )
  }

  async postRequest(_request: UnsealRequest): Promise<TxRef> {
    throw new Error(
      'refused: writing to Gnosis needs a funded key and a deployed contract. ' +
        'Set CLAVE_CHAIN=mock to iterate without spending.',
    )
  }

  async observeRequests(_minConfirmations: number): Promise<ObservedRequest[]> {
    if (!this.options.contractAddress) return []
    throw new Error(
      'refused: request log reading needs the deployed contract ABI',
    )
  }
}

// ---------------------------------------------------------------------------

// Default is mock. A developer who has not thought about it does not spend
// money, and a deployment that wants the real chain has to say so.
export function chainFromEnv(env: NodeJS.ProcessEnv = process.env): Chain {
  if (env.CLAVE_CHAIN !== 'gnosis') return new MockChain()
  const rpcUrl = env.CLAVE_GNOSIS_RPC
  if (!rpcUrl) {
    throw new Error('refused: CLAVE_CHAIN=gnosis needs CLAVE_GNOSIS_RPC')
  }
  return new GnosisChain({
    rpcUrl,
    contractAddress: env.CLAVE_GNOSIS_CONTRACT ?? '',
    privateKey: env.CLAVE_GNOSIS_KEY,
  })
}
