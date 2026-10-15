
import {html} from "lit"
import {batch} from "@e280/strata"
import {debounce} from "@e280/stz"
import {lightView, useOnce, useSignal} from "@e280/sly"
import {addressMoniker, Card, User} from "@e280/authlocal"

import {consts} from "../consts.js"
import {LinkView} from "./link.js"
import {MarkdownView} from "./markdown.js"
import {markdown} from "../utils/markdown.js"
import {encryptSecretLink} from "../utils/encrypt-secret-link.js"

export const AuthorView = lightView((user: User, recipientUserId: string, recipientCryptId: string) => {
	const $text = useSignal("")
	const $link = useSignal<null | string>(null)
	const $md = useSignal<null | ReturnType<typeof markdown>>(null)

	const updateHeavy = useOnce(() => debounce(300, (text: string) => {
		batch(() => {
			$md(markdown(text))
			$link(encryptSecretLink(user, recipientUserId, recipientCryptId, text))
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
				<h2>write a secret message to ${Card({id: recipientUserId})}</h2>
				<textarea
					x-glowie
					@input=${onTextInput}
					placeholder="enter your secret message here"
					maxlength="${consts.maxmessage}"
				></textarea>
				<p>markdown. limit ${$text().length}/${consts.maxmessage}.</p>
			</div>

			${(text.length && link && md) ? html`
				<div class="mantle linkbox">
					<h2>copy and send this link to ${addressMoniker(recipientUserId)}</h2>
					${LinkView(link)}
				</div>

				<div class="mantle previewbox">
					<h2>preview of what they'll see</h2>
					${MarkdownView(text, md)}
				</div>
			` : null}
		</div>
	`
})
 
