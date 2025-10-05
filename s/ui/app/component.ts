
import {html} from "lit"
import {spa, view} from "@e280/sly"
import {DrawerControl} from "@e280/shiny"

import styleCss from "./style.css.js"
import {Context} from "../context.js"
import themeCss from "../theme.css.js"
import {DashboardView} from "../pages/dashboard/view.js"

export class AppMain extends (view.component(use => {
	use.css(themeCss, styleCss)

	const context = use.once(() => new Context())
	const drawerControl = use.once(() => new DrawerControl())

	const router = use.once(() => new spa.Router({
		routes: {
			dashboard: spa.route("#/", async() =>
				DashboardView
					.props(context)
					.children(html`<slot></slot>`)
					.render()
			),
			contact: spa.route("#/contact/{id}", async({id}) => html`contact ${id}`),
			encrypt: spa.route("#/encrypt/{id}", async({id}) => html`encrypt for ${id}`),
			decryptLink: spa.route("#/decrypt/{payload}", async({payload}) => html`decrypt payload ${payload.length}`),
			decrypt: spa.route("#/decrypt", async() => html`decryptor`),
		},
	}))

	const renderLink = <N extends spa.Navigable>(
			label: string,
			nav: N,
			...params: spa.Params<N>
		) => html`
		<a
			href="${nav.hash(...params)}"
			?data-active="${nav.active}"
			@click="${() => drawerControl.close()}">
				${label}
		</a>
	`

	return context.shiny.ShinyDrawer
		.props({button: true, side: "left", control: drawerControl})
		.children(html`
			<header>
				<nav>
					${renderLink("dashboard", router.nav.dashboard)}
				</nav>
			</header>

			<main slot=plate>${router.render()}</main>
		`)
		.render()
})) {}

