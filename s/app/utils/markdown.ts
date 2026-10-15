
import {micromark} from "micromark"

export type MarkdownReport = ReturnType<typeof markdown>

export function markdown(text: string) {
	const template = document.createElement("template")
	template.innerHTML = micromark(text)

	let linkCount = 0
	let imageCount = 0

	function linkSafety(link: HTMLAnchorElement) {
		link.target = "_blank"
		link.referrerPolicy = "no-referrer"
		link.rel = "noopener noreferrer nofollow ugc"
		return link
	}

	for (const link of template.content.querySelectorAll("a")) {
		linkCount++
		linkSafety(link)
	}

	for (const img of template.content.querySelectorAll("img")) {
		imageCount++
		const link = linkSafety(document.createElement("a"))
		link.href = img.src
		link.title = img.alt
		link.textContent = img.alt
			? `[image "${img.alt}" ${img.src}]`
			: `[image ${img.src}]`

		img.replaceWith(link)
	}

	return {
		linkCount,
		imageCount,
		content: template.innerHTML,
	}
}

