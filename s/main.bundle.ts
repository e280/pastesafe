
import {html} from "lit"
import {base62, debounce, txt} from "@e280/stz"
import {lightElement, lightView, register, router, useOnce, useSignal, watchHash} from "@e280/sly"
import {address, addressMoniker, Auth, decrypt, deriveSecret, deriveSharedSecret, encrypt, generateKeypair, hash, makeAuthWidget, signClaim, User, verifyClaim, verifyProof} from "@e280/authlocal"

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

type MessageClaim = {keyId: string, ciphertext: string}

function encryptMessageLink(user: User, recipientId: string, message: string) {
	const ephemeral = generateKeypair()
	const shared = deriveSharedSecret(ephemeral.secret, recipientId)
	const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
	const ciphertext = base62(encrypt(key, txt.toBytes(message)))
	const claimToken = signClaim(user.session.crypt, <MessageClaim>{keyId: ephemeral.id, ciphertext})
	const moniker = addressMoniker(user.id)
	const tidbit = ephemeral.id.slice(0, 8)
	return `${location.origin}/#/secret/${moniker}/${tidbit}/${claimToken}`
}

function gatekeep<X>(fn: (user: User) => X) {
	const {user} = auth
	return user
		? fn(user)
		: html`
			<p>okay please go ahead and login:</p>
			<auth-widget>Sign in with Authlocal</auth-widget>
		`
}

function errorprone<X>(probably: string, fn: () => X) {
	try { return fn() }
	catch (error) {
		console.error(error)
		return html`
			<div>
				<p>${probably}</p>
				<p><a href="#/">let's go back home</a></p>
			</div>
		`
	}
}

const AppMain = lightElement(() => {
	const $hash = useOnce(watchHash)
	const route = useOnce(() => router({

		"": lightView(() => {
			return html`
				<slot name=header></slot>
				<div>
					<p><a href="#/send">i want to send a secret</a></p>
					<p><a href="#/recv">i want to receive a secret</a></p>
				</div>
			`
		}),

		"send": lightView(() => {
			const recvLink = `${location.origin}/#/recv`
			return html`
				<slot name=header></slot>
				<div>
					<p>okay now you have to send this link to your buddy (then they do the next part):</p>
					<p><a href="${recvLink}">${recvLink}</a></p>
					<p><a href="#/">nevermind, i want to go back</a></p>
				</div>
			`
		}),

		"recv": lightView(() => {
			return html`
				<slot name=header></slot>
				<div>
					<p>(wip: recv)</p>
					${gatekeep(user => {
						const url = makeInviteLink(user)
						const short = url.slice(0, 60)
						return html`
							<p>send this invite link to your buddy (then it's their turn):</p>
							<p><a href="${url}">${short}...</a></p>
						`
					})}
					<p><a href="#/">nevermind, i want to go back</a></p>
				</div>
			`
		}),

		"invite/{moniker}/{proofToken}": lightView(({moniker, proofToken}) => {
			const AuthorView = useOnce(() => lightView((user: User, recipientId: string) => {
				const $link = useSignal("")
				const encrypt = useOnce(() => debounce(300, (message: string) => {
					$link(encryptMessageLink(user, recipientId, message))
				}))
				const onTextInput = (event: InputEvent) => {
					const textarea = event.currentTarget as HTMLTextAreaElement
					encrypt(textarea.value)
				}
				const link = $link()
				const short = link.slice(0, 70)
				return html`
					<textarea @input=${onTextInput}></textarea>
					<p><a href="${link}">${short}</a></p>
				`
			}))

			return errorprone("bad invite", () => {
				const proof = verify(moniker, proofToken)
				return html`
					<slot name=header></slot>
					<div>
						<p>sending to: ${address(proof.id)}</p>
						${gatekeep(user => AuthorView(user, proof.delegateId))}
						<p><a href="#/">nevermind, i want to go back</a></p>
					</div>
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

				return html`
					<slot name=header></slot>
					<div>
						<p>message is from: ${address(proof.id)}</p>
						${gatekeep(user => {
							const {keyId, ciphertext} = <MessageClaim>claim
							const shared = deriveSharedSecret(user.cryptSecret, keyId)
							const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
							const cleartext = decrypt(key, base62.toBytes(ciphertext))
							const message = txt(cleartext)
							return html`
								<textarea readonly>${message}</textarea>
							`
						})}
						<p><a href="#/">nevermind, i want to go back</a></p>
					</div>
				`
			})
		}),
	}))

	return route($hash()) ?? html`<h2>404 not found.</h2>`
})

register({
	AppMain,
	AuthWidget: makeAuthWidget(auth),
})

await auth.remember()

