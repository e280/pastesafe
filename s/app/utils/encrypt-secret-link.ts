
import {base62, txt} from "@e280/stz"
import {addressMoniker, deriveSecret, deriveSharedSecret, encrypt, generateKeypair, hash, signClaim, User} from "@e280/authlocal"
import {consts} from "../consts.js"
import {MessageClaim} from "../types.js"

export function encryptSecretLink(user: User, recipientUserId: string, recipientCryptId: string, message: string) {
	const ephemeral = generateKeypair()
	const tidbit = ephemeral.id.slice(0, consts.tidbitlen)

	const shared = deriveSharedSecret(ephemeral.secret, recipientCryptId)
	const key = deriveSecret(shared, hash("pastesafe/secret/v1"))

	const ciphertext = base62(
		encrypt(key, txt.toBytes(message))
	)

	const claimToken = signClaim(user.session.crypt, <MessageClaim>{
		keyId: ephemeral.id,
		recipientUserId,
		ciphertext,
	})

	const from = addressMoniker(user.id)
	const to = addressMoniker(recipientUserId)
	return `${location.origin}/#/secret/from/${from}/to/${to}/${tidbit}/0/${claimToken}`
}

