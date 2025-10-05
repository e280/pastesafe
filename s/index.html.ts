
import {ssg, html} from "@e280/scute"

const title = "pastesafe"
const domain = "pastesafe.org"
const favicon = "/assets/jar.png"
const description = "send secrets in public"

export default ssg.page(import.meta.url, async orb => ({
	title,
	js: "main.bundle.min.js",
	css: "main.css",
	dark: true,

	socialCard: {
		title,
		description,
		themeColor: "#0f0",
		siteName: domain,
		image: `https://${domain}${favicon}`,
	},

	head: html`
		<link rel="icon" href="${favicon}">
		<meta content="app-version" version="${orb.packageVersion()}"/>

		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Share+Tech&display=swap" rel="stylesheet">
	`,

	body: html`
		<app-main>
			<section>
				<img class=logo src="${favicon}" alt=""/>
				<h1>pastesafe</h1>
				<p>send secrets in public.</p>
				<p class=version>v${orb.packageVersion()}</p>
			</section>
		</app-main>
	`,
}))

