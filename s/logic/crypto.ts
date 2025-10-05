
import {Hex} from "@e280/stz"
import {ed25519} from "@noble/curves/ed25519.js"

export function deriveEncryptionPubkey(id: string) {
	const edpub = Hex.toBytes(id)
	const montpub = ed25519.utils.toMontgomery(edpub)
	return Hex.fromBytes(montpub)
}

