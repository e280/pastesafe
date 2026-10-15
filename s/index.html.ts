
import {template, html, dataSvgEmoji, socialCard} from "@e280/scute"

export default template(import.meta.url, async orb => html`
	<!doctype html>
	<html>
		<head>
			<meta charset="utf-8"/>
			<meta name="viewport" content="width=device-width,initial-scale=1"/>
			<meta name="darkreader-lock"/>
			<meta http-equiv="x-dns-prefetch-control" content="off">
			<style>@layer base{html{background:#000}}</style>

			<title>pastesafe</title>
			<link rel="icon" href="${dataSvgEmoji("🤫")}"/>
			<script type="module" src="${orb.hashurl("main.bundle.min.js")}"></script>

			<style>${orb.inject("main.css")}</style>

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
					<div class=titlezone>
						<div class=logo>🤫</div>
						<hgroup>
							<h1><a href="#/">pastesafe</a></h1>
							<h2>secrets in public</h2>
						</hgroup>
					</div>
					<auth-widget no-alias>sign in</auth-widget>
				</header>

				<app-main></app-main>

				<footer>
					<div>
						<p class=explain>pastesafe encrypts secret messages into links that only the intended recipient can decrypt.</p>
					</div>
					<div>
						<p><a href="https://github.com/e280/pastesafe">open-source on github</a></p>
						<p class=version>v${orb.packageVersion()}</p>
					</div>
				</footer>
			</div>
		</body>
	</html>
`)

