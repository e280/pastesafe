
import {html} from "lit"
import {batch} from "@e280/strata"
import {ShinyCopy} from "@e280/shiny"
import {base62, debounce, errorString, txt} from "@e280/stz"
import {lightElement, lightView, register, router, useOnce, useSignal, watchHash} from "@e280/sly"
import {addressMoniker, Auth, Card, decrypt, deriveSecret, deriveSharedSecret, encrypt, generateKeypair, hash, makeAuthWidget, signClaim, User, verifyClaim, verifyProof} from "@e280/authlocal"
import {markdown} from "./utils/markdown.js"

const auth = new Auth()
const shortlen = 75
const tidbitlen = 8

function makeInviteLink(userId: string, proofToken: string) {
	const moniker = addressMoniker(userId)
	return `${location.origin}/#/invite/to/${moniker}/0/${proofToken}`
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
	return `${location.origin}/#/secret/from/${from}/to/${to}/${tidbit}/0/${claimToken}`
}

function gatekeep<X>(requestedId: string | null, fn: (user: User) => X) {
	const {user} = auth
	return user
		? fn(user)
		: html`
			${requestedId
				? html`<p>please login as ${Card({id: requestedId})}</p>`
				: html`<p>okay please go ahead and login:</p>`}
			<auth-widget>sign-in</auth-widget>
		`
}

function errorprone<X>(fn: () => X) {
	try { return fn() }
	catch (error) {
		console.error(error)
		return html`
			<h2 class=error>${errorString(error, "error")}</h2>
			<footer>
				<p><a href="#/">let's go back home</a></p>
			</footer>
		`
	}
}

const JuicyLink = lightView((link: string) => {
	const short = link.length > shortlen
		? link.slice(0, shortlen) + "..."
		: link
	return html`
		<p x-juicylink>
			<a href="${link}">${short}</a>
			${ShinyCopy(link)}
		</p>
	`
})

const AuthorView = lightView((user: User, recipientUserId: string, recipientCryptId: string) => {
	const $preview = useSignal("")
	const $link = useSignal("")
	const link = $link()

	const update = useOnce(() => debounce(300, (message: string) => {
		batch(() => {
			$preview("")
			$link("")
			$preview(markdown(message))
			$link(encryptMessageLink(user, recipientUserId, recipientCryptId, message))
		})
	}))

	const onTextInput = (event: InputEvent) => {
		const textarea = event.currentTarget as HTMLTextAreaElement
		update(textarea.value)
	}

	return html`
		<div class=authorbox>
			<textarea @input=${onTextInput} placeholder="enter your secret message here"></textarea>
			${link.length ? html`
				<p>now send this link to your buddy:</p>
				${JuicyLink(link)}
			` : null}
			<div class=markdown .innerHTML="${$preview()}"></div>
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
			const url = `${location.origin}/#/recv`
			return html`
				<div class=mantle>
					<h2>send this link to the secret receiver:</h2>
					${JuicyLink(url)}
					<p>it'll prompt them to send an invite link back to you.</p>
				</div>
			`
		}),

		"recv": lightView(() => {
			return html`
				${gatekeep(null, user => {
					const url = makeInviteLink(user.id, user.session.crypt.proofToken)
					return html`
						<div class=mantle>
							<h2>send this invite link:</h2>
							${JuicyLink(url)}
							<p>this link lets anyone encrypt secrets that only you can read.</p>
						</div>
					`
				})}
			`
		}),

		"invite/to/{moniker}/{version}/{proofToken}": lightView(({version, moniker, proofToken}) => {
			return errorprone(() => {
				if (version !== "0") throw new Error("unsupported version")
				const proof = verify(moniker, proofToken)
				return html`
					<div class=mantle>
						<h2>write your secret to ${Card({id: proof.id})}</h2>
					</div>

					${gatekeep(null, user => AuthorView(user, proof.id, proof.delegateId))}
				`
			})
		}),

		"secret/from/{from}/to/{to}/{tidbit}/{version}/{claimToken}": lightView(({version, to, from, claimToken}) => {
			return errorprone(() => {
				if (version !== "0") throw new Error("unsupported version")
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
					<p>message is from: ${Card({id: proof.id})}</p>
					${gatekeep(recipientUserId, user => {
						if (user.id === recipientUserId) {
							const shared = deriveSharedSecret(user.cryptSecret, keyId)
							const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
							const cleartext = decrypt(key, base62.toBytes(ciphertext))
							const message = txt(cleartext)
							const replyUrl = makeInviteLink(proof.id, proofToken)
							return html`
								<p>message decrypted:</p>
								<textarea readonly>${message}</textarea>
								<p>you can create a reply:</p>
								${JuicyLink(replyUrl)}
							`
						}
						else {
							return html`
								<p>this message is not for you.</p>
								<p>it's for ${Card({id: recipientUserId})}</p>
							`
						}
					})}
				`
			})
		}),
	}))

	return html`
		<div class=plate>
			${route($hash()) ?? html`
				<h2 class=error>404 not found.</h2>
				<footer>
					<p><a x-button href="#/">back to homepage.</a></p>
				</footer>
			`}
		</div>
	`
})

register({
	AppMain,
	AuthWidget: makeAuthWidget(auth),
})

await auth.remember()

