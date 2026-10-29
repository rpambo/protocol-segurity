# Spirit Embassy — Protocol & Security

Angular 20 front-end prototype for Spirit Embassy, the GoodNews Church. The public landing page presents its Christ-centred mission and the protocol and security service that supports branches worldwide, alongside team sign-in. The current screens also include a member portal (home, protocols, dress code, media library and profile), plus the administration dashboard and management pages.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```powershell
npm install
npm start
```

Open `http://localhost:4200/`.

## Build

```powershell
npm run build
```

All screen data is illustrative. Sign-in and route protection are a local front-end demonstration only; authentication, authorization, persistent storage, live audit events, file uploads, and API integration are not connected yet. The MVP's first language is English, and content access is intended to follow global, regional, or local/branch scope and the user's role. The prototype layout follows the shared [Figma design](https://www.figma.com/design/hiQDYz9pKWN66tRw7frUut/spirit-embassy?node-id=0-1&p=f&t=kX9FmJrMlBgsNxiu-0).

## Hero photo credits

- `public/images/hero-protocol-cc-by.png`: Rashad Cartwright, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Rashad_Cartwright_Headshot.jpg). Displayed with a CSS crop.
- `public/images/prophet-uebert-angel.png`: Straightshoot101, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:New_Suit1.jpg). Displayed with a CSS crop.
- `public/images/hero-media.png` and `public/images/hero-dress-code.png`: Unsplash images, used under the [Unsplash License](https://unsplash.com/license).
- `public/images/protocol-team-woman.jpg`: Unsplash photo `1531123897727-8f129e1688ce`, used under the [Unsplash License](https://unsplash.com/license). The closing call-to-action's parallax backdrop pairs it with the credited `hero-protocol-cc-by.png` photograph; both are illustrative team portraits, not identified Spirit Embassy personnel.

The homepage country-flag ticker spans the full page width and shows the 24 locations supplied for the branch preview: United Kingdom, United States, South Africa, Zimbabwe, Botswana, Namibia, Zambia, Ireland, France, Australia, Germany, Angola, Canada, Belgium, Burundi, Fiji, India, Mozambique, Nigeria, Rwanda, Tanzania, Uganda, Kenya, and Puerto Rico. The mission section includes an original transparent SVG globe, `public/images/spirit-embassy-world-map.svg`, with a circular silhouette, slowly rotating Natural Earth 1:50m country boundaries, highlighted locations, and animated gold routes; it displays no location names and respects reduced-motion preferences. Puerto Rico is included as supplied in the list. Natural Earth geographic data is public domain ([source](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries/)). The flags are local SVG assets from [FlagCDN](https://flagcdn.com/). The list is shown as supplied for the branch preview; it is not independently verified as a complete official directory.

The closing section includes a continuously scrolling leadership photo gallery, styled like the country-flag ticker. Prophet Uebert Angel is shown using the credited Wikimedia Commons photo above; BeBe Angel and the global protocol/security leadership currently use clearly labelled, original illustration placeholders until approved portraits and leader names are provided. The gallery pauses on hover or keyboard focus and respects reduced-motion preferences.

The protocol and security section includes a static, illustrative platform interface preview inspired by the member portal. It is not a live dashboard or a screenshot of connected branch data.
