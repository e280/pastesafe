
import {html} from "lit"
import {lightView} from "@e280/sly"
import {ShinyCopy} from "@e280/shiny"
import {MarkdownReport} from "../utils/markdown.js"

export const MarkdownView = lightView((text: string, md: MarkdownReport) => {
	return html`
		<div class=markdown>
			${(md.linkCount || md.imageCount)
				? html`<p class=note>(remember, opening links reveals your ip address)</p>`
				: null}

			<div class=secret x-glowie>
				<header>${ShinyCopy(text)}</header>
				<div class=prose .innerHTML="${md.content}"></div>
			</div>
		</div>
	`
})

