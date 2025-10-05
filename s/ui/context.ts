
import {shiny, themes} from "@e280/shiny"
import {AuthlocalInstallation} from "@e280/authlocal"
import {EncryptionPubkeyCache} from "../logic/pubkeys.js"

export class Context {
	readonly version = document.head
		.querySelector(`meta[content="app-version"]`)!
		.getAttribute("value")!

	shiny = shiny({theme: themes.aura}).views
	pubkeys = new EncryptionPubkeyCache()

	constructor(public authlocal: AuthlocalInstallation) {}
}

