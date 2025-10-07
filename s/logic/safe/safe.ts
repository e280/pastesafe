
import {Hex, MapG, Txt} from "@e280/stz"
import {ed25519, x25519} from "@noble/curves/ed25519.js"

export type Manifest = {

	/** authlocal id (ed25519 pubkey) */
	to: string

	/** authlocal id (ed25519 pubkey) */
	from: string

	/** salting to create separate channels */
	salt: string
}

export class MockAuthlocal {
	#origin = "https://pastesafe.org"
	#edkeys = new MapG<string, string>()

	makeIdentity() {
		const keys = ed25519.keygen()
		this.#edkeys.set(
			Hex.fromBytes(keys.publicKey),
			Hex.fromBytes(keys.secretKey),
		)
	}

	async deriveSharedSecret(aliceId: string, bobXPub: string, salt: string) {
		const aliceSecret = this.#edkeys.require(aliceId)
		const aliceXSecret = ed25519.utils.toMontgomerySecret(Hex.toBytes(aliceSecret))
		const shared = x25519.getSharedSecret(aliceXSecret, Hex.toBytes(bobXPub))
		const hash = await crypto.subtle.digest("SHA-256", new Uint8Array([
			...Txt.toBytes(this.#origin),
			...Txt.toBytes(salt),
			...shared,
		]))
		return Hex.fromBytes(new Uint8Array(hash))
	}
}

export class SymkeyJuggler {
	#cache = new MapG<string, string>()
	constructor(private authlocal: MockAuthlocal) {}

	async #cachify(aliceId: string, bobId: string, salt: string, fn: () => Promise<string>) {
		const cacheKeyA = `${aliceId}.${bobId}.${salt}`
		const cacheKeyB = `${bobId}.${aliceId}.${salt}`
		const cached = this.#cache.get(cacheKeyA) ?? this.#cache.get(cacheKeyB)
		if (cached) return cached
		const fresh = await fn()
		this.#cache.set(cacheKeyA, fresh)
		this.#cache.set(cacheKeyB, fresh)
		return fresh
	}

	async #obtain(aliceId: string, bobId: string, salt: string) {
		return this.#cachify(aliceId, bobId, salt, async() => {
			const bobXPub = Hex.fromBytes(ed25519.utils.toMontgomery(Hex.toBytes(bobId)))
			return this.authlocal.deriveSharedSecret(aliceId, bobXPub, salt)
		})
	}

	async getSymkeyAsSender({from, to, salt}: Manifest) {
		return this.#obtain(from, to, salt)
	}

	async getSymkeyAsRecipient({from, to, salt}: Manifest) {
		return this.#obtain(to, from, salt)
	}
}

