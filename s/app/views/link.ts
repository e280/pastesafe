
import {html} from "lit"
import {lightView} from "@e280/sly"
import {ShinyCopy} from "@e280/shiny"

import {consts} from "../consts.js"

export const LinkView = lightView((link: string) => {
	const short = link.length > consts.shortlen
		? link.slice(0, consts.shortlen) + "..."
		: link

	return html`
		<p x-juicylink>
			<a href="${link}">${short}</a>
			${ShinyCopy(link)}
		</p>
	`
})

