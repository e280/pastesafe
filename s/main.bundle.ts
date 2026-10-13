
import {html} from "lit"
import {base62, debounce, txt} from "@e280/stz"
import {lightElement, lightView, register, router, useOnce, useSignal, watchHash} from "@e280/sly"
import {addressEmoji, addressMoniker, Auth, decrypt, deriveSecret, deriveSharedSecret, encrypt, generateKeypair, hash, makeAuthWidget, signClaim, User, verifyClaim, verifyProof} from "@e280/authlocal"

const auth = new Auth()

function makeInviteLink(user: User) {
	const moniker = addressMoniker(user.id)
	const {proofToken} = user.session.crypt
	return `${location.origin}/#/invite/${moniker}/${proofToken}`
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
	const shared = deriveSharedSecret(ephemeral.secret, recipientCryptId)
	const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
	const ciphertext = base62(encrypt(key, txt.toBytes(message)))
	const claimToken = signClaim(user.session.crypt, <MessageClaim>{keyId: ephemeral.id, recipientUserId, ciphertext})
	const moniker = addressMoniker(user.id)
	const tidbit = ephemeral.id.slice(0, 8)
	return `${location.origin}/#/secret/${moniker}/${tidbit}/${claimToken}`
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
	const short = link.slice(0, 70)
	return html`
		<div class=authorbox>
			<textarea @input=${onTextInput} placeholder="enter your message here"></textarea>
			${link.length
				? html`
					<p>now send this link to your buddy:</p>
					<p class=link><a href="${link}">${short}...</a></p>
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
				<p><a href="${recvLink}">${recvLink}</a></p>
				<footer>
					<p><a href="#/">back to home</a></p>
				</footer>
			`
		}),

		"recv": lightView(() => {
			return html`
				${gatekeep(null, user => {
					const url = makeInviteLink(user)
					const short = url.slice(0, 60)
					return html`
						<p>send this invite link to your buddy (then it's their turn):</p>
						<p><a href="${url}">${short}...</a></p>
					`
				})}
				<footer>
					<p><a href="#/">back to home</a></p>
				</footer>
			`
		}),

		"invite/{moniker}/{proofToken}": lightView(({moniker, proofToken}) => {
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

		"secret/{moniker}/{tidbit}/{claimToken}": lightView(({moniker, claimToken}) => {
			return errorprone("bad message", () => {
				const {proof, claim} = verifyClaim(claimToken, {
					allowedIssuers: [location.origin],
					allowedPurposes: ["crypt"],
					maxAge: Infinity,
					maxProofAge: Infinity,
				})

				if (moniker !== addressMoniker(proof.id))
					throw new Error("bad moniker")

				const {keyId, recipientUserId, ciphertext} = <MessageClaim>claim

				return html`
					<p>message is from: ${addressEmoji(proof.id)} ${addressMoniker(proof.id)}</p>
					${gatekeep(recipientUserId, user => {
						if (user.id === recipientUserId) {
							const shared = deriveSharedSecret(user.cryptSecret, keyId)
							const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
							const cleartext = decrypt(key, base62.toBytes(ciphertext))
							const message = txt(cleartext)
							return html`
								<textarea readonly>${message}</textarea>
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

