
import {shiny, themes} from "@e280/shiny"

export class Context {
	readonly version = document.head
		.querySelector(`meta[content="app-version"]`)!
		.getAttribute("value")!

	shiny = shiny({theme: themes.aura}).views
}

