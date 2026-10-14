
import {micromark} from "micromark"
import {gfm, gfmHtml} from "micromark-extension-gfm"

export function markdown(text: string) {
	const template = document.createElement("template")

	template.innerHTML = micromark(text, {
		extensions: [gfm()],
		htmlExtensions: [gfmHtml()],
	})

	for (const link of template.content.querySelectorAll("a")) {
		link.target = "_blank"
		link.rel = "noopener noreferrer nofollow ugc"
	}

	return template.innerHTML
}

