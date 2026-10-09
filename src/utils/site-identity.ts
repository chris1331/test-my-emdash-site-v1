/** Resolved media reference from getSiteSettings() */
export interface MediaReference {
	mediaId: string;
	alt?: string;
	url?: string;
}

export interface BlogSiteIdentitySettings {
	title?: string;
	tagline?: string;
	logo?: MediaReference;
	favicon?: MediaReference;
}

const DEFAULT_SITE_TITLE = "Burger Gelato Media";
const DEFAULT_SITE_TAGLINE = "Practical digital marketing insights for small businesses ready to grow smarter, not harder.";

export function resolveBlogSiteIdentity(settings?: BlogSiteIdentitySettings) {
	return {
		siteTitle: settings?.title ?? DEFAULT_SITE_TITLE,
		siteTagline: settings?.tagline ?? DEFAULT_SITE_TAGLINE,
		siteLogo: settings?.logo?.url
			? settings.logo
			: {
					url: "/images/logo/logo.png",
					alt: "Burger Gelato Media",
					mediaId: "logo",
				},
	};
}
