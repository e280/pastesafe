
import {html} from "lit"
import {base62, txt} from "@e280/stz"
import {lightElement, lightView, register, router, useOnce, watchHash} from "@e280/sly"
import {addressMoniker, Auth, Card, decrypt, deriveSecret, deriveSharedSecret, hash, makeAuthWidget, verifyClaim} from "@e280/authlocal"

import {MessageClaim} from "./app/types.js"
import {LinkView} from "./app/views/link.js"
import {renderMarkdown} from "./app/utils/render-markdown.js"
import {gatekeep} from "./app/utils/gatekeep.js"
import {AuthorView} from "./app/views/author.js"
import {MarkdownView} from "./app/views/markdown.js"
import {errorprone} from "./app/utils/errorprone.js"
import {makeInviteLink} from "./app/utils/make-invite-link.js"
import {verifyMonikerAndProof} from "./app/utils/verify-moniker-and-proof.js"

const auth = new Auth()

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
					<h2>send this link to your friend.</h2>
					<p>then they should send an invite link back to you.</p>
					${LinkView(url)}
				</div>
			`
		}),

		"recv": lightView(() => {
			return gatekeep({
				auth,
				pleaseLogin: () => html`
					<h2>please sign-in, so you can make an invite link.</h2>
					<p>then you'll be able to receive encrypted secrets.</p>
				`,
				loggedIn: user => {
					const url = makeInviteLink(user.id, user.session.crypt.proofToken)
					return html`
						<div class=mantle>
							<h2>send this invite link to your friend.</h2>
							<p>it lets anybody encrypt secrets that only you can read.</p>
							${LinkView(url)}
						</div>
					`
				},
			})
		}),

		"invite/to/{moniker}/{version}/{proofToken}": lightView(({version, moniker, proofToken}) => {
			return errorprone(() => {
				if (version !== "0") throw new Error("unsupported version")
				const proof = verifyMonikerAndProof(moniker, proofToken)
				return gatekeep({
					auth,
					loggedIn: user => AuthorView(user, proof.id, proof.delegateId),
					pleaseLogin: () => html`
						<h2>${Card({id: proof.id})} invites you to send a secret message.</h2>
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
					auth,
					pleaseLogin: () => html`
						<div class=mantle>
							${heading}
							<p>to decrypt it, please sign-in as ${addressMoniker(recipientUserId)}.</p>
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
									${MarkdownView(message, renderMarkdown(message))}
								</div>
								<div class=mantle>
									<a x-button href="${replyUrl}">reply</a>
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

