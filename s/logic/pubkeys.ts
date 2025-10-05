
import {MapG} from "@e280/stz"
import {deriveEncryptionPubkey} from "./crypto.js"

export class EncryptionPubkeyCache {
	#map = new MapG<string, string>()

	derive(id: string) {
		return this.#map.guarantee(id, () => deriveEncryptionPubkey(id))
	}
}

