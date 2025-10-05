
import {dom} from "@e280/sly"
import {authlocal} from "@e280/authlocal"

import {Context} from "./ui/context.js"
import {prepAppMain} from "./ui/app/component.js"

dom.register({
	AppMain: prepAppMain(
		new Context(
			await authlocal.install({theme: authlocal.themes.basic}),
		)
	),
})

