
import {html} from "lit"
import {errorString} from "@e280/stz"

export function errorprone<X>(fn: () => X) {
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

