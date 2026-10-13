
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
				description: "send secrets in public",
				siteName: "https://pastesafe.org/",
				image: `https://pastesafe.org/assets/jar.png`,
			})}
		</head>
		<body>
			<div class=ground>
				<header>
					<img class=logo src="${orb.hashurl('./assets/jar.png')}" alt=""/>
					<div class=stack>
						<h1>pastesafe <small>v${orb.packageVersion()}</small></h1>
						<p>send secrets in public.</p>
					</div>
					<auth-widget>sign-in</auth-widget>
				</header>

				<app-main></app-main>

				<footer>
					<p><a href="https://github.com/e280/pastesafe">github.com/e280/pastesafe</a></p>
				</footer>
			</div>
		</body>
	</html>
`)

