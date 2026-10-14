
import {template, html, dataSvgEmoji, socialCard} from "@e280/scute"

export default template(import.meta.url, async orb => html`
	<!doctype html>
	<html>
		<head>
			<meta charset="utf-8"/>
			<meta name="viewport" content="width=device-width,initial-scale=1"/>
			<meta name="darkreader-lock"/>
			<style>@layer base{html{background:#000}}</style>

			<title>pastesafe</title>
			<link rel="icon" href="${dataSvgEmoji("🫙")}"/>
			<link rel="stylesheet" href="${orb.hashurl("main.css")}"/>
			<script type="module" src="${orb.hashurl("main.bundle.min.js")}"></script>

			${socialCard({
				themeColor: "#8FCC8F",
				title: "pastesafe",
				description: "secrets in public",
				siteName: "https://pastesafe.org/",
				image: `https://pastesafe.org/assets/jar.png`,
			})}
		</head>
		<body>
			<div class=ground>
				<header>
					<hgroup>
						<h1>pastesafe</h1>
						<h2>secrets in public</h2>
					</hgroup>
					<auth-widget>sign-in</auth-widget>
				</header>

				<app-main></app-main>

				<footer>
					<div>
						<p class=explain>pastesafe encrypts secret messages into links that only the intended recipient can decrypt.</p>
					</div>
					<div>
						<p><a href="https://github.com/e280/pastesafe">learn more on the github</a></p>
						<p class=version>v${orb.packageVersion()}</p>
					</div>
				</footer>
			</div>
		</body>
	</html>
`)

