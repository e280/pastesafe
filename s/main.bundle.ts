
import {html} from "lit"
import {batch} from "@e280/strata"
import {ShinyCopy} from "@e280/shiny"
import {base62, debounce, errorString, txt} from "@e280/stz"
import {Content, lightElement, lightView, register, router, useOnce, useSignal, watchHash} from "@e280/sly"
import {addressMoniker, Auth, Card, decrypt, deriveSecret, deriveSharedSecret, encrypt, generateKeypair, hash, makeAuthWidget, signClaim, User, verifyClaim, verifyProof} from "@e280/authlocal"
import {markdown, MarkdownReport} from "./utils/markdown.js"

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

function gatekeep<X>(options: {
		pleaseLogin?: () => Content,
		loggedIn: (user: User) => X,
	}) {

	const {user} = auth
	const {
		loggedIn,
		pleaseLogin = () => html`<h2>please sign-in:</h2>`,
	} = options

	return user
		? loggedIn(user)
		: html`
			<div class=mantle>
				${pleaseLogin()}
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

const MarkdownView = lightView((text: string, md: MarkdownReport) => {
	return html`
		<div class=markdown x-glowie>
			<header>
				<div>
					${(md.linkCount || md.imageCount)
						? html`<p class=note>(remember, opening links reveals your ip address)</p>`
						: null}
				</div>
				${ShinyCopy(text)}
			</header>
			<div class=prose .innerHTML="${md.content}"></div>
		</div>
	`
})

const AuthorView = lightView((user: User, recipientUserId: string, recipientCryptId: string) => {
	const $text = useSignal("")
	const $link = useSignal<null | string>(null)
	const $md = useSignal<null | ReturnType<typeof markdown>>(null)

	const updateHeavy = useOnce(() => debounce(300, (text: string) => {
		batch(() => {
			$md(markdown(text))
			$link(encryptMessageLink(user, recipientUserId, recipientCryptId, text))
		})
	}))

	const onTextInput = (event: InputEvent) => {
		const textarea = event.currentTarget as HTMLTextAreaElement
		const text = textarea.value
		$text(text)
		updateHeavy(text)
	}

	const text = $text()
	const link = $link()
	const md = $md()

	return html`
		<div class="mantle authorbox">
			<div class="mantle inputbox">
				<h2>write a secret to ${Card({id: recipientUserId})}</h2>
				<textarea
					x-glowie
					@input=${onTextInput}
					placeholder="enter your secret message here"
					maxlength="${maxmessage}"
				></textarea>
				<p>markdown. limit ${$text().length}/${maxmessage}.</p>
			</div>

			${(text.length && link && md) ? html`
				<div class="mantle linkbox">
					<h2>send this link to ${addressMoniker(recipientUserId)}</h2>
					${JuicyLink(link)}
				</div>

				<div class="mantle previewbox">
					<h2>preview of what they'll see</h2>
					${MarkdownView(text, md)}
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
					<a class=recv x-button href="#/recv">i want to <strong>receive</strong> a secret</a>
					<a class=send x-button href="#/send">i want to <strong>send</strong> a secret</a>
				</div>
			`
		}),

		"send": lightView(() => {
			const url = `${location.origin}/#/recv`
			return html`
				<div class=mantle>
					<h2>send this link to your friend</h2>
					${JuicyLink(url)}
					<p>they should send back an invite link</p>
				</div>
			`
		}),

		"recv": lightView(() => {
			return gatekeep({
				pleaseLogin: () => html`
					<h2>please sign-in, so you can make an invite link</h2>
					<p>then you'll be able to receive encrypted secrets</p>
				`,
				loggedIn: user => {
					const url = makeInviteLink(user.id, user.session.crypt.proofToken)
					return html`
						<div class=mantle>
							<h2>send this invite link to your friend</h2>
							${JuicyLink(url)}
							<p>this link lets anyone encrypt secrets that only you can read</p>
						</div>
					`
				},
			})
		}),

		"invite/to/{moniker}/{version}/{proofToken}": lightView(({version, moniker, proofToken}) => {
			return errorprone(() => {
				if (version !== "0") throw new Error("unsupported version")
				const proof = verify(moniker, proofToken)
				return gatekeep({
					loggedIn: user => AuthorView(user, proof.id, proof.delegateId),
					pleaseLogin: () => html`
						<h2>${Card({id: proof.id})} invites you to write them a secret</h2>
						<p>only they will be able to read it, but you need to sign-in first</p>
					`,
				})
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

				const heading = html`<h2>secret from ${Card({id: proof.id})} to ${Card({id: recipientUserId})}</h2>`

				const content = gatekeep({
					pleaseLogin: () => html`
						<div class=mantle>
							${heading}
							<p>to decrypt it, please sign-in as ${addressMoniker(recipientUserId)}</p>
						</div>
					`,
					loggedIn: user => {
						if (user.id === recipientUserId) {
							const shared = deriveSharedSecret(user.cryptSecret, keyId)
							const key = deriveSecret(shared, hash("pastesafe/secret/v1"))
							const cleartext = decrypt(key, base62.toBytes(ciphertext))
							const message = txt(cleartext)
							const replyUrl = makeInviteLink(proof.id, proofToken)
							return html`
								<div class="mantle display">
									${heading}
									${MarkdownView(message, markdown(message))}
								</div>
								<div class=mantle>
									<h2>reply link:</h2>
									${JuicyLink(replyUrl)}
								</div>
							`
						}
						else {
							return html`
								<div class=mantle>
									${heading}
									<h2 class=error>you cannot decrypt this secret, it's not for you.</h2>
									<p>you're currently logged in as ${addressMoniker(user.id)}.</p>
									<p><button x-button @click=${() => auth.logout()}>logout</button></p>
								</div>
							`
						}
					},
				})

				return html`
					<div class="mantle readerbox">
						${content}
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

