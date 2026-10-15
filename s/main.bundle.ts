
import {html} from "lit"
import {batch} from "@e280/strata"
import {ShinyCopy} from "@e280/shiny"
import {base62, debounce, errorString, txt} from "@e280/stz"
import {Content, lightElement, lightView, register, router, useOnce, useSignal, watchHash} from "@e280/sly"
import {addressMoniker, Auth, Card, decrypt, deriveSecret, deriveSharedSecret, encrypt, generateKeypair, hash, makeAuthWidget, signClaim, User, verifyClaim, verifyProof} from "@e280/authlocal"
import {markdown} from "./utils/markdown.js"

const auth = new Auth()
const shortlen = 75
const tidbitlen = 8
const maxmessage = 8000

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

function gatekeep<X>(requestedId: string | null, loggedIn: (user: User) => X, loggedOut = (): Content => {}) {
	const {user} = auth
	return user
		? loggedIn(user)
		: html`
			<div class=mantle>
				${loggedOut()}
				${requestedId
					? html`<h2>you need to login as ${Card({id: requestedId})}</h2>`
					: html`<h2>please login:</h2>`}
				<auth-widget>sign-in</auth-widget>
			</div>
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

const MarkdownView = lightView((md: string, content: string) => {
	return html`
		<div class=markdown x-glowie>
			<header>${ShinyCopy(md)}</header>
			<div class=prose .innerHTML="${content}"></div>
		</div>
	`
})

const AuthorView = lightView((user: User, recipientUserId: string, recipientCryptId: string) => {
	const $text = useSignal("")
	const $link = useSignal("")
	const $mdContent = useSignal("")

	const updateText = useOnce(() => debounce(100, (message: string) => {
		$text(message)
	}))

	const updateHeavy = useOnce(() => debounce(300, (message: string) => {
		batch(() => {
			$mdContent(markdown(message))
			$link(encryptMessageLink(user, recipientUserId, recipientCryptId, message))
		})
	}))

	const onTextInput = (event: InputEvent) => {
		const textarea = event.currentTarget as HTMLTextAreaElement
		const message = textarea.value
		updateText(message)
		updateHeavy(message)
	}

	return html`
		<div class=authorbox>
			<div class="mantle inputbox">
				<textarea x-glowie @input=${onTextInput} placeholder="enter your secret message here" max="${maxmessage}"></textarea>
				<p>markdown. limit ${$text().length}/${maxmessage}.</p>
			</div>

			${$link().length ? html`
				<div class="mantle linkbox">
					<h2>your secret is encrypted in this link:</h2>
					${JuicyLink($link())}
					<p>send it to ${addressMoniker(recipientUserId)}, only they can decrypt it.</p>
				</div>

				<div class="mantle previewbox">
					<h2>preview of what they'll see:</h2>
					${MarkdownView($text(), $mdContent())}
				</div>
			` : null}
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
					<h2>send this link to the secret-receiver:</h2>
					${JuicyLink(url)}
					<p>then they should send back an invite link.</p>
				</div>
			`
		}),

		"recv": lightView(() => {
			return html`
				${gatekeep(null, user => {
					const url = makeInviteLink(user.id, user.session.crypt.proofToken)
					return html`
						<div class=mantle>
							<h2>send this invite link to the secret-giver:</h2>
							${JuicyLink(url)}
							<p>this link lets anyone encrypt secrets that only you can read.</p>
						</div>
					`
				}, () => html`<h2>you've been asked to receive a secret.</h2>`)}
			`
		}),

		"invite/to/{moniker}/{version}/{proofToken}": lightView(({version, moniker, proofToken}) => {
			return errorprone(() => {
				if (version !== "0") throw new Error("unsupported version")
				const proof = verify(moniker, proofToken)
				return html`
					<div class=mantle>
						<h2>write a secret to ${Card({id: proof.id})}</h2>
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
					<div class="mantle secretrecv">
						<h2>this secret is from ${Card({id: proof.id})}</h2>

						${gatekeep(recipientUserId, user => {
							if (user.id === recipientUserId) {
								const shared = deriveSharedSecret(user.cryptSecret, keyId)
								const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
								const cleartext = decrypt(key, base62.toBytes(ciphertext))
								const message = txt(cleartext)
								const replyUrl = makeInviteLink(proof.id, proofToken)
								return html`
									${MarkdownView(message, markdown(message))}
									<h2>you can make a reply at this link:</h2>
									${JuicyLink(replyUrl)}
								`
							}
							else {
								return html`
									<h2 class=error>this secret is not for you.</h2>
									<p>it's actually for ${Card({id: recipientUserId})}</p>
								`
							}
						})}
					</div>
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

