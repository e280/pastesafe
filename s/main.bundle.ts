
import {html} from "lit"
import {base62, debounce, txt} from "@e280/stz"
import {lightElement, lightView, register, router, useOnce, useSignal, watchHash} from "@e280/sly"
import {addressEmoji, addressMoniker, Auth, decrypt, deriveSecret, deriveSharedSecret, encrypt, generateKeypair, hash, makeAuthWidget, signClaim, User, verifyClaim, verifyProof} from "@e280/authlocal"

const auth = new Auth()
const shortlen = 80
const tidbitlen = 8

function makeInviteLink(userId: string, proofToken: string) {
	const moniker = addressMoniker(userId)
	return `${location.origin}/#/invite/to/${moniker}/${proofToken}`
}

function verify(moniker: string, proofToken: string) {
	const proof = verifyProof(proofToken, {
		allowedAudiences: [location.origin],
		allowedPurposes: ["crypt"],
	})

	if (moniker !== addressMoniker(proof.id))
		throw new Error("bad moniker")

	return proof
}

type MessageClaim = {keyId: string, recipientUserId: string, ciphertext: string}

function encryptMessageLink(user: User, recipientUserId: string, recipientCryptId: string, message: string) {
	const ephemeral = generateKeypair()
	const tidbit = ephemeral.id.slice(0, tidbitlen)
	const shared = deriveSharedSecret(ephemeral.secret, recipientCryptId)
	const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
	const ciphertext = base62(encrypt(key, txt.toBytes(message)))
	const claimToken = signClaim(user.session.crypt, <MessageClaim>{keyId: ephemeral.id, recipientUserId, ciphertext})
	const from = addressMoniker(user.id)
	const to = addressMoniker(recipientUserId)
	return `${location.origin}/#/secret/from/${from}/to/${to}/${tidbit}/${claimToken}`
}

function gatekeep<X>(requestedId: string | null, fn: (user: User) => X) {
	const {user} = auth
	return user
		? fn(user)
		: html`
			${requestedId
				? html`<p>please login as ${addressEmoji(requestedId)} ${addressMoniker(requestedId)}</p>`
				: html`<p>okay please go ahead and login:</p>`}
			<auth-widget>sign-in</auth-widget>
		`
}

function errorprone<X>(probably: string, fn: () => X) {
	try { return fn() }
	catch (error) {
		console.error(error)
		return html`
			<p>${probably}</p>
			<footer>
				<p><a href="#/">let's go back home</a></p>
			</footer>
		`
	}
}

const AuthorView = lightView((user: User, recipientUserId: string, recipientCryptId: string) => {
	const $link = useSignal("")
	const encrypt = useOnce(() => debounce(300, (message: string) => {
		$link(encryptMessageLink(user, recipientUserId, recipientCryptId, message))
	}))
	const onTextInput = (event: InputEvent) => {
		const textarea = event.currentTarget as HTMLTextAreaElement
		encrypt(textarea.value)
	}
	const link = $link()
	const short = link.slice(0, shortlen)
	return html`
		<div class=authorbox>
			<textarea @input=${onTextInput} placeholder="enter your secret message here"></textarea>
			${link.length
				? html`
					<p>now send this link to your buddy:</p>
					<p class=link x-biglink><a href="${link}">${short}...</a></p>
				`
				: null}
		</div>
	`
})

const AppMain = lightElement(() => {
	const $hash = useOnce(watchHash)
	const route = useOnce(() => router({

		"": lightView(() => {
			return html`
				<div class=homescreen>
					<p><a x-button href="#/send">i want to send a secret</a></p>
					<p><a x-button href="#/recv">i want to receive a secret</a></p>
				</div>
			`
		}),

		"send": lightView(() => {
			const recvLink = `${location.origin}/#/recv`
			return html`
				<p>okay now you have to send this link to your buddy (then they do the next part):</p>
				<p x-biglink><a href="${recvLink}">${recvLink}</a></p>
				<footer>
					<p><a href="#/">back to home</a></p>
				</footer>
			`
		}),

		"recv": lightView(() => {
			return html`
				${gatekeep(null, user => {
					const url = makeInviteLink(user.id, user.session.crypt.proofToken)
					const short = url.slice(0, shortlen)
					return html`
						<p>send this invite link to your buddy (then it's their turn):</p>
						<p x-biglink><a href="${url}">${short}...</a></p>
					`
				})}
				<footer>
					<p><a href="#/">back to home</a></p>
				</footer>
			`
		}),

		"invite/to/{moniker}/{proofToken}": lightView(({moniker, proofToken}) => {
			return errorprone("bad invite", () => {
				const proof = verify(moniker, proofToken)
				return html`
					<p>sending to: ${addressEmoji(proof.id)} ${addressMoniker(proof.id)}</p>
					${gatekeep(null, user => AuthorView(user, proof.id, proof.delegateId))}
					<footer>
						<p><a href="#/">back to home</a></p>
					</footer>
				`
			})
		}),

		"secret/from/{from}/to/{to}/{tidbit}/{claimToken}": lightView(({to, from, claimToken}) => {
			return errorprone("bad message", () => {
				const {proof, proofToken, claim: {keyId, recipientUserId, ciphertext}} =
					verifyClaim<MessageClaim>(claimToken, {
						allowedIssuers: [location.origin],
						allowedPurposes: ["crypt"],
						maxAge: Infinity,
						maxProofAge: Infinity,
					})

				if (from !== addressMoniker(proof.id))
					throw new Error("bad 'from' moniker")

				if (to !== addressMoniker(recipientUserId))
					throw new Error("bad 'to' moniker")

				return html`
					<p>message is from: ${addressEmoji(proof.id)} ${addressMoniker(proof.id)}</p>
					${gatekeep(recipientUserId, user => {
						if (user.id === recipientUserId) {
							const shared = deriveSharedSecret(user.cryptSecret, keyId)
							const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
							const cleartext = decrypt(key, base62.toBytes(ciphertext))
							const message = txt(cleartext)

							const replyUrl = makeInviteLink(proof.id, proofToken)
							const replyUrlShort = replyUrl.slice(0, shortlen)

							return html`
								<p>message decrypted:</p>
								<textarea readonly>${message}</textarea>

								<p>you can create a reply:</p>
								<p x-biglink><a href="${replyUrl}">${replyUrlShort}...</a></p>
							`
						}
						else {
							return html`
								<p>this message is not for you.</p>
								<p>it's for ${addressEmoji(recipientUserId)} ${addressMoniker(recipientUserId)}</p>
							`
						}
					})}
					<p><a href="#/">back to homepage.</a></p>
				`
			})
		}),
	}))

	return html`
		<div class=plate>
			${route($hash()) ?? html`<h2>404 not found.</h2>`}
		</div>
	`
})

register({
	AppMain,
	AuthWidget: makeAuthWidget(auth),
})

await auth.remember()

